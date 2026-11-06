import type { Point, Rect } from '@diagrist/core';

/** Does the piece from `a` to `b` pass through the inside of `r`? */
export function through(a: Point, b: Point, r: Rect): boolean {
  return (
    Math.min(a[0], b[0]) < r.x + r.w &&
    Math.max(a[0], b[0]) > r.x &&
    Math.min(a[1], b[1]) < r.y + r.h &&
    Math.max(a[1], b[1]) > r.y
  );
}

/** Do two axis-parallel pieces cross or touch? */
export function meets(a: Point, b: Point, c: Point, d: Point): boolean {
  const overlap = (k: 0 | 1) =>
    Math.min(a[k], b[k]) <= Math.max(c[k], d[k]) && Math.min(c[k], d[k]) <= Math.max(a[k], b[k]);
  return overlap(0) && overlap(1);
}

/** The pieces of a route, each from one point to the next. */
export const piecesOf = (points: readonly Point[]): (readonly [Point, Point])[] =>
  points.slice(1).map((b, k) => [points[k] as Point, b] as const);
