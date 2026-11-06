import type { Rect } from '@diagrist/core';
import type { SeqFragment, SequenceModel } from '../model/types.js';
import type { Bar } from './bars.js';
import { type BoxArt, tagShapes } from './boxes.js';
import { messageExtent } from './messages.js';
import type { Rows } from './rows.js';
import { fragmentTag, guardText, operandGuard, type SeqCtx, tagWidth } from './text.js';
import type { SeqMessageArt, SeqShape } from './types.js';

interface Inputs {
  readonly m: SequenceModel;
  readonly rows: Rows;
  readonly xs: ReadonlyMap<string, number>;
  readonly messages: readonly SeqMessageArt[];
  readonly boxes: readonly BoxArt[];
  readonly bars: readonly Bar[];
  /** Heads of created lifelines: a fragment holding the creation holds the head. */
  readonly createdHeads: ReadonlyMap<string, Rect>;
}

/** Activation bars that cut the horizontal band `x..x+w` between `top` and `bottom`. */
const barsIn = (bars: readonly Bar[], x: number, w: number, top: number, bottom: number) =>
  bars.filter((b) => b.rect.x < x + w && b.rect.x + b.rect.w > x && b.rect.y < bottom && b.rect.y + b.rect.h > top);

/** First position from `x` where a text of width `w` covers no bar: otherwise to the right past the bar. */
function clearOf(bars: readonly Bar[], x: number, w: number, top: number, bottom: number, c: SeqCtx): number {
  const [gap, pad] = [c.s.guardGap, c.s.knockout];
  let at = x;
  for (let hit = barsIn(bars, at - pad, w + 2 * pad, top, bottom); hit.length > 0; ) {
    at = Math.max(...hit.map((b) => b.rect.x + b.rect.w)) + gap;
    hit = barsIn(bars, at - pad, w + 2 * pad, top, bottom);
  }
  return at;
}

/** The frame of a combined fragment as drawn: its outline, its tag and the grounds of its guards. */
export interface FrameArt {
  readonly fragment: SeqFragment;
  readonly rect: Rect;
  readonly tag: Rect;
  readonly guards: readonly Rect[];
}

/** The knocked-out ground of a guard, so lifelines do not cross it. */
function guardBack(text: string, x: number, y: number, c: SeqCtx): Rect {
  const { lineH: lh, knockout: pad, descent } = c.s;
  return { x: x - pad, y: y - lh + descent, w: c.width(text, c.s.messageSize) + 2 * pad, h: lh };
}

/** A guard on its ground. */
const guard = (text: string, back: Rect, x: number, y: number): SeqShape[] => [
  { kind: 'rect', rect: back, role: 'knockout' },
  { kind: 'text', at: { x, y }, text, role: 'guard', anchor: 'start' },
];

/** Horizontal extent of all events in `from..to`, without frames. */
function contentExtent(input: Inputs, from: number, to: number, c: SeqCtx): number[] {
  const s = c.s;
  const out: number[] = [];
  const near = (id: string, r: number) => {
    const x = input.xs.get(id);
    if (x !== undefined) out.push(x - r, x + r);
  };
  input.m.diagram.events.forEach((e, i) => {
    if (i < from || i > to) return;
    const head = e.type === 'message' && e.kind === 'create' ? input.createdHeads.get(e.to) : undefined;
    if (head) out.push(head.x, head.x + head.w);
    if (e.type === 'message') {
      near(e.from, s.barW);
      near(e.to, s.barW);
    } else if (e.type === 'destroy') near(e.target, s.destroyR);
    else if (e.type === 'activate' || e.type === 'deactivate') near(e.target, s.barW);
    else if (e.type === 'coregion') near(e.on, s.coregionW);
  });
  for (const art of input.messages) if (art.index >= from && art.index <= to) out.push(...messageExtent(art));
  for (const box of input.boxes)
    if (box.index >= from && box.index <= to) out.push(box.rect.x, box.rect.x + box.rect.w);
  return out;
}

/** Frame, tag, guards and separators of one fragment, whose inner frames are already in `rects`. */
function frameOf(f: SeqFragment, rects: ReadonlyMap<SeqFragment, Rect>, input: Inputs, c: SeqCtx) {
  const s = c.s;
  const end = f.end ?? input.m.diagram.events.length - 1;
  const xs = contentExtent(input, f.index, end, c);
  for (const [g, r] of rects) if (g.index > f.index && g.index < end) xs.push(r.x, r.x + r.w);
  if (xs.length === 0) xs.push(...[...input.xs.values()].slice(0, 1).flatMap((x) => [x - s.headMinW / 2, x]));
  const op = fragmentTag(f.event);
  const top = input.rows.y[f.index] ?? 0;
  const bottom = input.rows.y[end] ?? top;
  const tagW = tagWidth(op, c);
  const blocked = barsIn(input.bars, Math.min(...xs) - s.framePadX, tagW + s.guardGap, top, top + s.tagH);
  const left = Math.min(Math.min(...xs) - s.framePadX, ...blocked.map((b) => b.rect.x - s.guardGap - tagW));
  const first = guardText(f.event);
  const lh = s.lineH;
  const baseline = top + s.tagH / 2 + s.textMid;
  const firstW = first ? c.width(first, s.messageSize) : 0;
  const firstX = clearOf(input.bars, left + tagW + s.guardGap, firstW, baseline - lh, baseline, c);
  const guards = f.operands.slice(1).map((o) => {
    const text = operandGuard(o.guard, o.marker);
    const y = (input.rows.y[o.index] ?? top) + s.guardH - s.descent;
    const w = c.width(text, s.messageSize);
    return { text, y, x: text ? clearOf(input.bars, left + s.guardGap, w, y - lh, y, c) : left, w };
  });
  const right = Math.max(
    Math.max(...xs) + s.framePadX,
    left + tagW,
    first ? firstX + firstW + s.guardGap : left,
    ...guards.map((g) => (g.text ? g.x + g.w + s.guardGap : left)),
  );
  const rect: Rect = { x: left, y: top, w: right - left, h: bottom - top };
  const shapes: SeqShape[] = [{ kind: 'rect', rect, role: 'frame' }, ...tagShapes(op, left, top, c)];
  const backs: Rect[] = [];
  if (first) {
    const back = guardBack(first, firstX, baseline, c);
    backs.push(back);
    shapes.push(...guard(first, back, firstX, baseline));
  }
  f.operands.slice(1).forEach((o, k) => {
    const y = input.rows.y[o.index] ?? top;
    shapes.push({ kind: 'line', seg: { x1: left, y1: y, x2: right, y2: y }, role: 'separator' });
    const g = guards[k];
    if (!g?.text) return;
    const back = guardBack(g.text, g.x, g.y, c);
    backs.push(back);
    shapes.push(...guard(g.text, back, g.x, g.y));
  });
  const tag: Rect = { x: left, y: top, w: tagW, h: s.tagH };
  return { art: { fragment: f, rect, tag, guards: backs }, shapes };
}

/**
 * Frames of the combined fragments, from the inside out: width from messages, references, notes and inner
 * frames plus room per level; a header with tag and guard, dashed separators between operands. Outer frames
 * are drawn first, so inner guards lie above outer separators. Each frame's outline, tag and guards come along as
 * data, in the order of the fragments.
 */
export function frameArts(input: Inputs, c: SeqCtx): { readonly shapes: SeqShape[]; readonly arts: FrameArt[] } {
  const rects = new Map<SeqFragment, Rect>();
  const drawn = new Map<SeqFragment, { art: FrameArt; shapes: SeqShape[] }>();
  const inner = [...input.m.fragments].sort((a, b) => b.depth - a.depth || a.index - b.index);
  for (const f of inner) {
    const frame = frameOf(f, rects, input, c);
    rects.set(f, frame.art.rect);
    drawn.set(f, frame);
  }
  const ordered = input.m.fragments.flatMap((f) => drawn.get(f) ?? []);
  return { shapes: ordered.flatMap((d) => d.shapes), arts: ordered.map((d) => d.art) };
}
