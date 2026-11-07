import { type Point, type Rect, textWidth } from '@diagrist/core';
import { cheapest, type Occupancy, occupancy, overlaps } from '@diagrist/layout-grid';
import type { UseCaseModel } from '../model.js';
import type { Comment } from './art.js';
import { border, commentAt } from './comment.js';
import { captionBoxes } from './drawn.js';
import type { Laid } from './laid.js';
import { type Anchors, rim } from './links.js';
import { UC, UC_FONTS, UC_GRID } from './metrics.js';
import type { NoteBox } from './note.js';
import { SUBJECT_TITLE } from './spec.js';

/** Reach of the search around the anchor, in steps of `UC.noteStep`. */
const REACH = 30;
/** The link of an extend note starts in the middle part of its line. */
const ANCHOR = [0.2, 0.8] as const;
/** A box over the area of a subject counts like a node, so the note of a subject stays outside. */
const INSIDE = 100;

/**
 * A note that found no free spot near its anchor: whether it lies on a node or a text rather than near a line or
 * frame, or found a free spot only further off than `FAR`.
 */
export interface Crowded {
  readonly id: string;
  readonly on: boolean;
  readonly far: boolean;
}

/** A link longer than this, with a free spot at its end, makes a note crowded too: room nearer is worth a layout. */
const FAR = 64;

/** The least conflict of a note on a text, as `occupancy` weighs it; a note on a line or frame line costs less. */
const ON_TEXT = 20;

/** Where the search for a note starts, where its link starts for a spot, and what else a spot costs. */
interface Anchor {
  readonly centre: Point;
  readonly start: (box: Point) => Point;
  /** Index of the route the link may touch (its own extend line), else -1. */
  readonly own: number;
  readonly on?: string;
  readonly penalty?: (box: Rect) => number;
}

/**
 * A note at the nearest spot without nodes, lines, frame lines and texts whose link crosses nothing, else the one
 * with the fewest conflicts, and how many it has. The box is taken.
 */
function placed(
  n: NoteBox,
  a: Anchor,
  room: Occupancy,
): { readonly comment: Comment; readonly conflicts: number; readonly reach: number } {
  const span = 2 * REACH + 1;
  const options = Array.from({ length: span ** 2 }, (_, k) => {
    const cx = a.centre[0] + (Math.floor(k / span) - REACH) * UC.noteStep;
    const cy = a.centre[1] + ((k % span) - REACH) * UC.noteStep;
    const p = a.start([cx, cy]);
    const rect = { x: Math.round(cx - n.width / 2), y: Math.round(cy - n.height / 2), w: n.width, h: n.height };
    const end = border(rect, p);
    return { p, rect, reach: Math.hypot(end[0] - p[0], end[1] - p[1]), end };
  })
    .filter((o) => o.reach >= UC.noteGap)
    .sort((x, y) => x.reach - y.reach);
  const extra = (o: (typeof options)[number]) => room.link(o.p, o.end, a.own, a.on) + (a.penalty?.(o.rect) ?? 0);
  const chosen = cheapest(options, (o) => o.rect, room, extra) ?? options[0];
  const owner = { ...(a.on === undefined ? {} : { on: a.on }), ...(a.own < 0 ? {} : { route: a.own }) };
  if (!chosen)
    return { comment: commentAt({ x: 0, y: 0, w: n.width, h: n.height }, [], a.centre, owner), conflicts: 1, reach: 0 };
  const conflicts = room.cost(chosen.rect) + extra(chosen);
  room.take(chosen.rect);
  return { comment: commentAt(chosen.rect, n.texts, chosen.p, owner), conflicts, reach: chosen.reach };
}

/** Where the search for a note starts and how its link starts, by what it hangs on. */
function anchorOf(n: NoteBox, a: Anchors, frames: readonly Rect[]): Anchor | undefined {
  if (n.on.kind === 'line') {
    const own = a.route(n.on.relation);
    const r = own === undefined ? undefined : a.routes[own];
    if (own === undefined || r === undefined) return undefined;
    const [p, q] = [r.points[0] ?? [0, 0], r.points.at(-1) ?? [0, 0]];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const along = (t: number): Point => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    const start = ([cx, cy]: Point) => {
      const t = ((cx - p[0]) * (q[0] - p[0]) + (cy - p[1]) * (q[1] - p[1])) / len ** 2;
      return along(Math.min(ANCHOR[1], Math.max(ANCHOR[0], t)));
    };
    return { centre: along(0.5), start, own };
  }
  if (n.on.kind === 'subject') {
    const f = a.frame(n.on.id)?.rect;
    if (!f) return undefined;
    const start = ([x, y]: Point): Point => [
      Math.min(f.x + f.w, Math.max(f.x, x)),
      Math.min(f.y + f.h, Math.max(f.y, y)),
    ];
    const penalty = (box: Rect) => INSIDE * frames.filter((r) => overlaps(box, r, 2)).length;
    return { centre: [f.x + f.w, f.y], start, own: -1, on: n.on.id, penalty };
  }
  const node = a.node(n.on.id);
  if (!node) return undefined;
  const r = node.placed.rect;
  const centre: Point = [r.x + r.w / 2, r.y + r.h / 2];
  return { centre, start: (box) => rim(node.placed, node.model, box), own: -1, on: n.on.id };
}

/**
 * Notes at free spots near their anchor, in order: every text searches a field around it for a box without nodes,
 * lines, frame lines and other texts whose link crosses nothing, right of the left margin and below the top of the
 * picture; the sheet grows to the right and down around a note, so a spot there is free, not on something. Returns
 * the comments and the notes that found no such spot.
 */
export function freeNotes(
  m: UseCaseModel,
  laid: Omit<Laid, 'comments' | 'crowded'>,
  notes: readonly NoteBox[],
  anchors: Anchors,
): {
  readonly comments: readonly { readonly id: string; readonly c: Comment }[];
  readonly crowded: readonly Crowded[];
} {
  const { spec, layout, routes } = laid;
  const rects = [...layout.groups.map((g) => g.rect), ...layout.nodes.map((n) => n.rect)];
  const top = Math.min(...rects.map((r) => r.y));
  const margin = UC_GRID.margin;
  const area = { x: margin, y: top, w: Number.POSITIVE_INFINITY, h: Number.POSITIVE_INFINITY };
  const room = occupancy(spec, layout, routes, { area });
  const font = UC_FONTS.name;
  for (const g of layout.groups) {
    const label = m.subjects.get(g.id)?.label ?? '';
    const x = g.rect.x + SUBJECT_TITLE.x;
    room.take({ x, y: g.rect.y + SUBJECT_TITLE.y - font.size, w: textWidth(label, font), h: font.size + 4 });
  }
  for (const c of captionBoxes(spec, layout)) room.take(c.rect);
  for (const l of laid.labels) room.take(l.box);
  const frames = layout.groups.map((g) => g.rect);
  const crowded: Crowded[] = [];
  const comments = notes.flatMap((n) => {
    const a = anchorOf(n, anchors, frames);
    if (!a) return [];
    const got = placed(n, a, room);
    if (got.conflicts > 0 || got.reach > FAR)
      crowded.push({ id: n.id, on: got.conflicts >= ON_TEXT, far: got.conflicts === 0 });
    return [{ id: n.id, c: got.comment }];
  });
  return { comments, crowded };
}
