import type { Point } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';

/** A straight line: ends, unit direction, the normal texts stand on first, and length. */
export interface Line {
  readonly a: Point;
  readonly b: Point;
  readonly d: Point;
  readonly n: Point;
  readonly len: number;
}

export function lineOf(r: Route): Line {
  const a = r.points[0] ?? [0, 0];
  const b = r.points.at(-1) ?? a;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const d: Point = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const raw: Point = [-d[1], d[0]];
  const flip = Math.abs(d[0]) >= Math.abs(d[1]) ? raw[1] > 0 : raw[0] < 0;
  return { a, b, d, n: flip ? [-raw[0], -raw[1]] : raw, len };
}

/** The point at `t` (0 to 1) along the line. */
export const at = (l: Line, t: number): Point => [l.a[0] + l.d[0] * l.len * t, l.a[1] + l.d[1] * l.len * t];

/** Distance of the centre of a `w` by `h` box from the line along `n`, so its nearest corner keeps `gap` of air. */
export const clearance = (n: Point, w: number, h: number, gap: number): number =>
  Math.abs(n[0]) * (w / 2) + Math.abs(n[1]) * (h / 2) + gap;

/** Distance of a point from the piece of the line between its ends. */
export function distance(p: Point, l: Line): number {
  const t = Math.max(0, Math.min(l.len, (p[0] - l.a[0]) * l.d[0] + (p[1] - l.a[1]) * l.d[1]));
  return Math.hypot(p[0] - (l.a[0] + l.d[0] * t), p[1] - (l.a[1] + l.d[1] * t));
}
