import type { Point, Rect } from '@diagrist/core';
import type { Route } from '../layout.js';
import type { SeatMark } from './seat.js';

/** How far apart the spots along a piece are tried. */
const STEP = 4;

const onPiece = (p: Point, a: Point, b: Point): boolean =>
  p[0] >= Math.min(a[0], b[0]) &&
  p[0] <= Math.max(a[0], b[0]) &&
  p[1] >= Math.min(a[1], b[1]) &&
  p[1] <= Math.max(a[1], b[1]);

/** The rectangle of a mark `w` by `h` centred on a spot. */
export const markAt = ([x, y]: Point, w: number, h: number): Rect => ({ x: x - w / 2, y: y - h / 2, w, h });

/** Spots along a piece from `from`, or from its start when `from` is not on it, nearest first. */
function spotsOn([a, b]: readonly [Point, Point], from: Point, w: number, h: number): Point[] {
  const len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
  const size = a[1] === b[1] ? w : h;
  const lo = size / 2;
  const hi = len - size;
  if (hi < lo) return [];
  const at = (t: number): Point => [a[0] + ((b[0] - a[0]) * t) / len, a[1] + ((b[1] - a[1]) * t) / len];
  const start = onPiece(from, a, b) ? Math.abs(from[0] - a[0]) + Math.abs(from[1] - a[1]) : lo;
  const out: number[] = [];
  for (let d = 0; start + d <= hi || start - d >= lo; d += STEP)
    for (const t of d === 0 ? [start] : [start + d, start - d]) if (t >= lo && t <= hi) out.push(t);
  return out.map(at);
}

/**
 * Where a mark may stand on its route, in the order it is tried: where the kind put it, then along the piece it
 * stands on, nearest first, then along the other pieces from their start. A spot keeps half the mark from the start
 * of its piece and the whole mark from the end, where the arrowhead is.
 */
export function spotsOf(mark: SeatMark, routes: readonly Route[], w: number, h: number): Point[] {
  const points = routes[mark.route]?.points ?? [];
  const pieces = points.slice(1).map((b, i) => [points[i] as Point, b] as const);
  const from: Point = [mark.x, mark.y];
  const home = pieces.findIndex(([a, b]) => onPiece(from, a, b));
  const order = home < 0 ? pieces : [pieces[home] as (typeof pieces)[number], ...pieces.filter((_, i) => i !== home)];
  return [from, ...order.flatMap((piece) => spotsOn(piece, from, w, h))];
}
