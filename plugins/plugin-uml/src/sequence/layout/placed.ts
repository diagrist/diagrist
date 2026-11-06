import type { Placed, Rect } from '@diagrist/core';
import type { Span } from '@diagrist/lang';
import type { SeqFragment, SequenceModel } from '../model/types.js';
import type { BoxArt } from './boxes.js';
import type { FrameArt } from './frames.js';
import type { SeqHeadArt, SeqMessageArt } from './types.js';

/** What a sequence picture placed besides lifelines, bars and lines, as the layout knows it. */
export interface PlacedParts {
  readonly m: SequenceModel;
  readonly heads: readonly SeqHeadArt[];
  readonly boxes: readonly BoxArt[];
  readonly frames: readonly FrameArt[];
  /** In drawing order: message `k` is the line `k` of the anchors. */
  readonly messages: readonly SeqMessageArt[];
  readonly constraints: readonly { readonly rect: Rect; readonly span: Span }[];
  /** The frame `sd` around the interaction and its tag. */
  readonly outer?: { readonly rect: Rect; readonly tag: Rect };
}

/** Key of the frame `sd`, as its tag names it. */
const SD = 'sd';

const holds = (outer: Rect, r: Rect): boolean =>
  r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;

/** Keys of the fragments: their `id=`, else the operator and its count, such as `alt-2`. */
function fragmentKeys(fragments: readonly SeqFragment[]): Map<SeqFragment, string> {
  const counts = new Map<string, number>();
  return new Map(
    fragments.map((f) => {
      const n = (counts.get(f.event.operator) ?? 0) + 1;
      counts.set(f.event.operator, n);
      return [f, f.event.id ?? `${f.event.operator}-${n}`];
    }),
  );
}

/**
 * The frames around the event of index `i`, innermost first: its fragments by nesting, then the frame `sd`. A
 * fragment's own marker lies outside it.
 */
function framesAt(m: SequenceModel, framed: boolean, i: number): string[] {
  const keys = fragmentKeys(m.fragments);
  const around = m.fragments
    .filter((f) => f.index < i && i <= (f.end ?? Number.POSITIVE_INFINITY))
    .sort((a, b) => b.depth - a.depth)
    .map((f) => keys.get(f) ?? '');
  return framed ? [...around, SD] : around;
}

/**
 * What a sequence diagram placed, for the kernel's placement check and line check (ADR 0010, 0035): heads, notes,
 * references, state invariants and dividers as boxes, each in the innermost fragment around its event; fragments
 * and the frame `sd` as frames, each tag the head of its frame (`<frame>.name`) and each guard a text of its frame;
 * the label of message `k` as `label-<k>`, the line's further texts (duration, gate name) as `label-<k>.<n>`, and
 * the texts of time constraints. A text belongs into the innermost frame of its event that holds it, since a gate
 * name on the frame `sd` stands outside it.
 */
export function sequencePlaced(p: PlacedParts): Placed[] {
  const keys = fragmentKeys(p.m.fragments);
  const rects = new Map<string, Rect>(p.frames.map((f) => [keys.get(f.fragment) ?? '', f.rect]));
  if (p.outer) rects.set(SD, p.outer.rect);
  const span = (s: Span | undefined) => (s ? { span: s } : {});
  const inside = (i: number) => {
    const home = framesAt(p.m, p.outer !== undefined, i)[0];
    return home === undefined ? {} : { within: home };
  };
  const homed = (i: number, r: Rect) => {
    const home = framesAt(p.m, p.outer !== undefined, i).find((k) => {
      const frame = rects.get(k);
      return frame !== undefined && holds(frame, r);
    });
    return home === undefined ? {} : { within: home };
  };
  const created = new Map(
    p.m.diagram.events.flatMap((e, i): [string, number][] =>
      e.type === 'message' && e.kind === 'create' ? [[e.to, i]] : [],
    ),
  );
  const outer: Placed[] = p.outer
    ? [
        { key: SD, kind: 'frame', rect: p.outer.rect },
        { key: `${SD}.name`, kind: 'text', rect: p.outer.tag, within: SD },
      ]
    : [];
  const frames = p.frames.flatMap((f): Placed[] => {
    const key = keys.get(f.fragment) ?? '';
    return [
      { key, kind: 'frame', rect: f.rect, ...inside(f.fragment.index), ...span(f.fragment.event.span) },
      { key: `${key}.name`, kind: 'text', rect: f.tag, within: key },
      ...f.guards.map((rect, n): Placed => ({ key: `${key}.guard.${n + 1}`, kind: 'text', rect, within: key })),
    ];
  });
  const heads = p.heads.map((h): Placed => {
    const at = created.get(h.id);
    const home = at === undefined ? (p.outer ? { within: SD } : {}) : inside(at);
    return { key: h.id, kind: 'box', rect: h.rect, ...home, ...span(p.m.participants.get(h.id)?.span) };
  });
  const counts = new Map<string, number>();
  const boxes = p.boxes.map((b): Placed => {
    const e = p.m.diagram.events[b.index];
    const kind = e?.type ?? 'box';
    const n = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, n);
    const key = e?.type === 'ref' && e.id !== undefined ? e.id : `${kind}-${n}`;
    return { key, kind: 'box', rect: b.rect, ...inside(b.index), ...span(e?.span) };
  });
  const labels = p.messages.flatMap((art, k) => {
    const grounds = art.label.flatMap((s) => (s.kind === 'rect' && s.role === 'knockout' ? [s.rect] : []));
    const named = art.label.some((s) => s.kind === 'text' && s.role !== 'constraint');
    const e = p.m.diagram.events[art.index];
    return grounds.map((rect, n): Placed => {
      const key = n === 0 && named ? `label-${k}` : `label-${k}.${n + 1}`;
      return { key, kind: 'text', rect, ...homed(art.index, rect), ...span(e?.span) };
    });
  });
  const inSd = (r: Rect) => (p.outer && holds(p.outer.rect, r) ? { within: SD } : {});
  const constraints = p.constraints.map(
    (t, n): Placed => ({ key: `constraint-${n + 1}`, kind: 'text', rect: t.rect, ...inSd(t.rect), ...span(t.span) }),
  );
  return [...outer, ...frames, ...heads, ...boxes, ...labels, ...constraints];
}

/** The text boxes of dividers, keyed `divider-<n>`, each in the innermost fragment around it. */
export function dividerPlaced(m: SequenceModel, boxes: readonly { readonly index: number; readonly rect: Rect }[]) {
  return boxes.map((b, n): Placed => {
    const home = framesAt(m, m.framed !== undefined, b.index)[0];
    const span = m.diagram.events[b.index]?.span;
    return {
      key: `divider-${n + 1}`,
      kind: 'box',
      rect: b.rect,
      ...(home === undefined ? {} : { within: home }),
      ...(span ? { span } : {}),
    };
  });
}
