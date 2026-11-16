import { type Point, type Rect, segmentMeetsRect, segmentsIntersect } from '@diagrist/core';

/** A rectangle grown by `pad` on every side. */
export const grown = (r: Rect, pad: number): Rect => ({
  x: r.x - pad,
  y: r.y - pad,
  w: r.w + 2 * pad,
  h: r.h + 2 * pad,
});

/** Whether two rectangles overlap, each grown by `pad`. */
export const meets = (a: Rect, b: Rect, pad = 0): boolean =>
  a.x - pad < b.x + b.w && b.x - pad < a.x + a.w && a.y - pad < b.y + b.h && b.y - pad < a.y + a.h;

/** The smallest rectangle around all of `rects`. */
export function hull(rects: readonly Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, w: Math.max(...rects.map((r) => r.x + r.w)) - x, h: Math.max(...rects.map((r) => r.y + r.h)) - y };
}

/** Where the segment from `a` to `b` last runs in the rectangle, as a share of the way, or -1 when it misses it. */
function exitOf(a: Point, b: Point, r: Rect): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let lo = 0;
  let hi = 1;
  for (const [p, q] of [
    [-dx, a[0] - r.x],
    [dx, r.x + r.w - a[0]],
    [-dy, a[1] - r.y],
    [dy, r.y + r.h - a[1]],
  ] as const) {
    if (p === 0) {
      if (q < 0) return -1;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return -1;
  }
  return hi;
}

const lerp = (a: Point, b: Point, t: number): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** The polyline from the last point where it runs in any of `rects`, so it starts on the outline of all of them. */
function cutStart(points: readonly Point[], rects: readonly Rect[]): Point[] {
  let cut: { i: number; t: number } | undefined;
  for (let i = 0; i < points.length - 1; i++) {
    const t = Math.max(...rects.map((r) => exitOf(points[i] as Point, points[i + 1] as Point, r)));
    if (t >= 0) cut = { i, t };
  }
  if (!cut) return [...points];
  const a = points[cut.i] as Point;
  const b = points[cut.i + 1] as Point;
  return [lerp(a, b, cut.t), ...points.slice(cut.i + 1)];
}

/** A line from the middle of one shape to the middle of another, cut where it leaves the first and enters the second. */
export function clipped(points: readonly Point[], from: readonly Rect[], to: readonly Rect[]): Point[] {
  const start = cutStart(points, from);
  return cutStart([...start].reverse(), to).reverse();
}

/** Whether the polyline meets the rectangle grown by `pad`. */
export const lineMeets = (points: readonly Point[], r: Rect, pad = 0): boolean =>
  points.some((p, i) => i > 0 && segmentMeetsRect(points[i - 1] as Point, p, r, pad));

/** Whether two polylines really cross. */
export const linesCross = (a: readonly Point[], b: readonly Point[]): boolean =>
  a.some((p, i) => i > 0 && b.some((q, k) => k > 0 && segmentsIntersect(a[i - 1] as Point, p, b[k - 1] as Point, q)));

/** The quadratic curve from `a` to `b` bowed by `bow` to the left of its way, as a polyline of `steps` pieces. */
export function bowed(a: Point, b: Point, bow: number, steps = 24): Point[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const c: Point = [(a[0] + b[0]) / 2 + ((b[1] - a[1]) / len) * bow, (a[1] + b[1]) / 2 - ((b[0] - a[0]) / len) * bow];
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  });
}

/** Points rounded to tenths, so the drawing stays the same on every machine. */
export const rounded = (points: readonly Point[]): Point[] =>
  points.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
