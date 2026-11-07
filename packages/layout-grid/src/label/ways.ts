import type { Point, Rect } from '@diagrist/core';
import type { Route } from '../layout.js';
import type { GridMetrics } from '../spec.js';
import { type Line, type Place, placeStack, stacks, widthOf } from './blocks.js';
import type { SearchOptions } from './search.js';
import type { EdgeLabel, EdgeText } from './types.js';

/** How far apart the spots along a piece are tried. */
const STEP = 4;
/** Room a block standing on its line keeps from either end of its piece where the metrics give no `lead`. */
const END = 12;

interface Piece {
  readonly a: Point;
  readonly b: Point;
  readonly horizontal: boolean;
  readonly len: number;
}

const piecesOf = (points: readonly Point[], flatFirst: boolean): Piece[] =>
  points
    .slice(1)
    .map((b, i) => {
      const a = points[i] as Point;
      return { a, b, horizontal: a[1] === b[1], len: Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) };
    })
    .sort((p, q) => (flatFirst ? Number(q.horizontal) - Number(p.horizontal) : 0) || q.len - p.len);

/** How many times its height a piece runs where a long name beside it wraps first, so it stands among air. */
const AIR = 3;

/** Whether an upright piece is long enough for the wrapped stack of `text` to stand beside it among air. */
function roomy(piece: Piece, text: EdgeText, m: GridMetrics): boolean {
  const [wrapped] = stacks(text, true, m);
  return piece.len >= AIR * (wrapped?.length ?? 0) * m.labelLineH;
}

/** The rectangles a block of texts takes: their boxes, grown by the pad of texts on a line. */
export const rectsOf = (block: readonly EdgeLabel[], o: SearchOptions): Rect[] =>
  block.map((l) => {
    const pad = o.onLine?.pad;
    const r = l.box;
    return pad ? { x: r.x - pad.x, y: r.y - pad.y, w: r.w + 2 * pad.x, h: r.h + 2 * pad.y } : r;
  });

/**
 * Room a block standing on its line keeps from either end of its piece beyond its pad, for the arrowhead and the box:
 * the straight run the line check asks into a head (`lead`).
 */
const endRoom = (m: GridMetrics, o: SearchOptions): number => (m.lead ?? END) + (o.onLine?.pad.x ?? 0);

/** Offsets from the middle of a piece, nearest first, that keep a block `room` long over the piece, past `beyond`. */
function offsets(len: number, room: number, beyond = -1): number[] {
  const reach = Math.max(0, (len - room) / 2);
  const out = beyond < 0 ? [0] : [];
  for (let d = STEP; d <= reach; d += STEP) if (d > beyond) out.push(d, -d);
  return out;
}

/** The items of several iterables, one after the other. */
function* chain<T>(...parts: readonly Iterable<T>[]): Generator<T> {
  for (const p of parts) yield* p;
}

/**
 * Every way the texts of a route may stand, in tiers tried in order, a later one only where the one before held no
 * clear spot: texts on their line stand within the lead of their piece's ends first, then nearer them, and with
 * `beside` at the spots beside its vertical pieces; texts beside their line have one tier.
 */
export function tiers(
  route: Route,
  i: number,
  text: EdgeText,
  m: GridMetrics,
  o: SearchOptions,
): Generator<EdgeLabel[]>[] {
  const on = o.onLine !== undefined;
  const later = [
    ...(on ? [waysOf(route, i, text, m, o, true, true)] : []),
    ...(on && o.beside ? [waysOf(route, i, text, m, o, false, false)] : []),
  ];
  return [waysOf(route, i, text, m, o, on, false), ...(later.length > 0 ? [chain(...later)] : [])];
}

/** The ways of `tiers`, on the line with `on`, else beside it; `loose` the spots nearer the ends than the lead. */
function* waysOf(
  route: Route,
  i: number,
  text: EdgeText,
  m: GridMetrics,
  o: SearchOptions,
  on: boolean,
  loose: boolean,
): Generator<EdgeLabel[]> {
  const straight = route.points.length === 2;
  for (const piece of piecesOf(route.points, o.preferFlat)) {
    if (o.onLine && !on && piece.horizontal) continue;
    const places: Place[] = on
      ? ['on']
      : piece.horizontal
        ? [...(straight && text.name && text.detail ? (['split'] as const) : []), 'above', 'below']
        : text.accent
          ? ['right', 'left']
          : ['left', 'right'];
    for (const lines of stacks(text, !piece.horizontal && roomy(piece, text, m), m)) {
      const along = piece.horizontal ? widthOf(lines, m) : lines.length * m.labelLineH;
      const tight = on ? along + 2 * endRoom(m, o) : 0;
      const ds = loose
        ? offsets(piece.len, along + 2 * END, Math.max(0, (piece.len - tight) / 2))
        : offsets(piece.len, tight);
      for (const d of ds) {
        const t = 0.5 + d / Math.max(1, piece.len);
        const at: Point = [piece.a[0] + (piece.b[0] - piece.a[0]) * t, piece.a[1] + (piece.b[1] - piece.a[1]) * t];
        for (const place of places) yield placeStack(lines as Line[], at, place, i, m);
      }
    }
  }
}
