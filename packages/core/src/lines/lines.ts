import type { Point, Rect } from '../geometry.js';
import { segmentMeetsRect } from '../segment.js';
import type { LineRoute } from './types.js';

/** Overlap or distance below this many pixels is rounding. */
export const TOLERANCE = 1;

/** A straight piece of a line, with the index of its first point in the simplified line. */
export interface Segment {
  readonly a: Point;
  readonly b: Point;
  readonly index: number;
}

const same = (p: Point, q: Point): boolean => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;

/** The points without repeats and without points in the middle of a straight run, so each one left is a bend. */
export function simplify(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last !== undefined && same(last, p)) continue;
    const before = out.at(-2);
    if (before !== undefined && last !== undefined && collinear(before, last, p)) out.pop();
    out.push(p);
  }
  return out;
}

const collinear = (a: Point, b: Point, c: Point): boolean =>
  Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) < 1e-6 &&
  (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) >= 0;

/** The segments of a route after `simplify`. */
export function segmentsOf(route: LineRoute): Segment[] {
  const points = simplify(route.points);
  return points.slice(1).map((b, i) => ({ a: points[i] as Point, b, index: i }));
}

/** Length of a segment. */
export const lengthOf = (s: Segment): number => Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);

/** `h` for a horizontal segment, `v` for a vertical one, `d` for a slanted one. */
export const axisOf = (s: Segment): 'h' | 'v' | 'd' =>
  Math.abs(s.a[1] - s.b[1]) < 1e-6 ? 'h' : Math.abs(s.a[0] - s.b[0]) < 1e-6 ? 'v' : 'd';

/** Middle of a segment. */
export const middle = (s: Segment): Point => [(s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2];

/** Where two segments that cross meet. */
export function meeting(s: Segment, t: Segment): Point {
  const d = (s.b[0] - s.a[0]) * (t.b[1] - t.a[1]) - (s.b[1] - s.a[1]) * (t.b[0] - t.a[0]);
  const u = ((t.a[0] - s.a[0]) * (t.b[1] - t.a[1]) - (t.a[1] - s.a[1]) * (t.b[0] - t.a[0])) / d;
  return [s.a[0] + u * (s.b[0] - s.a[0]), s.a[1] + u * (s.b[1] - s.a[1])];
}

/** Whether two lines share a bundle, so they may share a trunk and a port. */
export const bundled = (r: LineRoute, s: LineRoute): boolean =>
  r.edge === s.edge || (r.bundles ?? []).some((b) => (s.bundles ?? []).includes(b));

const pointToSegment = (p: Point, s: Segment): number => {
  const dx = s.b[0] - s.a[0];
  const dy = s.b[1] - s.a[1];
  const q = dx * dx + dy * dy;
  const t = q === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dy) / q));
  return Math.hypot(p[0] - (s.a[0] + t * dx), p[1] - (s.a[1] + t * dy));
};

const pointToRect = (p: Point, r: Rect): number =>
  Math.hypot(Math.max(r.x - p[0], 0, p[0] - r.x - r.w), Math.max(r.y - p[1], 0, p[1] - r.y - r.h));

/** Shortest distance between a segment and a rectangle; 0 when they meet. */
export function segmentToRect(s: Segment, r: Rect): number {
  if (segmentMeetsRect(s.a, s.b, r)) return 0;
  const corners: Point[] = [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ];
  return Math.min(pointToRect(s.a, r), pointToRect(s.b, r), ...corners.map((c) => pointToSegment(c, s)));
}

/** Shortest distance between a rectangle and any segment of `segments`; infinite without segments. */
export const routeToRect = (segments: readonly Segment[], r: Rect): number =>
  Math.min(Number.POSITIVE_INFINITY, ...segments.map((s) => segmentToRect(s, r)));

/** Rounded to a tenth of a pixel, so reported measures read alike everywhere. */
export const tenth = (n: number): number => Math.round(n * 10) / 10;

/** A point rounded to a tenth of a pixel. */
export const rounded = (p: Point): Point => [tenth(p[0]), tenth(p[1])];
