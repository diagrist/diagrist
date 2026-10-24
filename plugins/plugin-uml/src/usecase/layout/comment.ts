import { type Point, type Rect, textWidth } from '@diagrist/core';
import { cheapest, type EdgeLabel, type Occupancy } from '@diagrist/layout-grid';
import type { KnownRelation } from '../diagram.js';
import type { Comment } from './art.js';
import type { Drawn } from './labels.js';
import { at } from './line.js';
import { UC, UC_FONTS } from './metrics.js';

/** Reach of the search around the anchor, in steps of `UC.noteStep`. */
const REACH = 30;
/** The link of an extend note starts in the middle part of its line. */
const ANCHOR = [0.2, 0.8] as const;
const FONT = UC_FONTS.label;
const LINE_H = FONT.size + 4;

/** `{voucher present}`: Diagrist sets the braces. */
export const conditionText = (when: string): string => `{${when}}`;

/** The lines of the note on an extend: condition and extension points; none without both. */
export function commentLines(r: KnownRelation): string[] {
  if (r.kind !== 'extend') return [];
  return [
    ...(r.when ? [`condition: ${conditionText(r.when)}`] : []),
    ...(r.at?.length ? [`extension point${r.at.length > 1 ? 's' : ''}: ${r.at.join(', ')}`] : []),
  ];
}

/** The point on the edge of the box towards `toward`, seen from its centre. */
function border(r: Rect, toward: Point): Point {
  const c: Point = [r.x + r.w / 2, r.y + r.h / 2];
  const dx = toward[0] - c[0];
  const dy = toward[1] - c[1];
  const tx = dx ? r.w / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const ty = dy ? r.h / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const t = Math.min(1, tx, ty);
  return [c[0] + dx * t, c[1] + dy * t];
}

/** Where the link starts at its element, depending on where the box lies, and who owns it. */
export interface Anchor {
  readonly centre: Point;
  readonly start: (box: Point) => Point;
  /** Index of the route the link may touch (its own extend line), else -1. */
  readonly own: number;
  readonly on?: string;
  /** Extra cost of a box, such as over the area of a subject. */
  readonly penalty?: (box: Rect) => number;
}

/**
 * A box near the anchor: the nearest spot without nodes, lines, frame lines and texts whose link crosses nothing,
 * else the one with the fewest conflicts. The box is taken.
 */
export function placeComment(texts: readonly string[], a: Anchor, room: Occupancy): Comment {
  const w = Math.ceil(Math.max(...texts.map((t) => textWidth(t, FONT))) + 2 * UC.notePad + UC.noteFold);
  const h = texts.length * LINE_H + 2 * UC.notePad;
  const span = 2 * REACH + 1;
  const options = Array.from({ length: span ** 2 }, (_, k) => {
    const cx = a.centre[0] + (Math.floor(k / span) - REACH) * UC.noteStep;
    const cy = a.centre[1] + ((k % span) - REACH) * UC.noteStep;
    const p = a.start([cx, cy]);
    const rect = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w, h };
    const end = border(rect, p);
    return { p, rect, end, reach: Math.hypot(end[0] - p[0], end[1] - p[1]) };
  })
    .filter((o) => o.reach >= UC.noteGap)
    .sort((x, y) => x.reach - y.reach);
  const extra = (o: (typeof options)[number]) => room.link(o.p, o.end, a.own, a.on) + (a.penalty?.(o.rect) ?? 0);
  const chosen = cheapest(options, (o) => o.rect, room, extra) ?? options[0];
  if (!chosen) return { rect: { x: 0, y: 0, w, h }, link: [a.centre, a.centre], lines: [], conflicts: 1 };
  const conflicts = room.cost(chosen.rect) + extra(chosen);
  room.take(chosen.rect);
  const lines = texts.map((text, i) => ({
    text,
    x: chosen.rect.x + UC.notePad,
    y: chosen.rect.y + UC.notePad + i * LINE_H + FONT.size,
  }));
  return {
    ...(a.on === undefined ? {} : { on: a.on }),
    ...(a.own < 0 ? {} : { route: a.own }),
    rect: chosen.rect,
    link: [chosen.p, chosen.end],
    lines,
    conflicts,
  };
}

/** The note of an extend line: condition and extension points, linked to the middle part of the line. */
export function extendComment(d: Drawn, room: Occupancy): Comment | undefined {
  const texts = commentLines(d.relation);
  if (!texts.length) return undefined;
  const l = d.line;
  const start = ([cx, cy]: Point) => {
    const t = ((cx - l.a[0]) * l.d[0] + (cy - l.a[1]) * l.d[1]) / l.len;
    return at(l, Math.min(ANCHOR[1], Math.max(ANCHOR[0], t)));
  };
  return placeComment(texts, { centre: at(l, 0.5), start, own: d.route }, room);
}

/** The lines of a comment as labels of its route, so frames grow around them and the kernel checks them. */
export const commentLabels = (c: Comment): EdgeLabel[] =>
  c.route === undefined
    ? []
    : c.lines.map((t) => {
        const w = textWidth(t.text, FONT);
        return {
          ...t,
          anchor: 'start',
          box: { x: t.x, y: t.y - FONT.size, w, h: FONT.size + 2 },
          route: c.route ?? 0,
          part: 'detail',
        };
      });
