import type { Point, Rect } from '@diagrist/core';

/** A side of a rectangle, where an edge leaves or enters it. */
export type Side = 'top' | 'bottom' | 'left' | 'right';

export const right = (r: Rect): number => r.x + r.w;
export const bottom = (r: Rect): number => r.y + r.h;
export const cx = (r: Rect): number => r.x + r.w / 2;
export const cy = (r: Rect): number => r.y + r.h / 2;

export const OPPOSITE: Readonly<Record<Side, Side>> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' };

/** Rectangles overlap when they share more than an edge; `pad` grows both by that much. */
export function overlaps(a: Rect, b: Rect, pad = 0): boolean {
  return a.x - pad < right(b) && right(a) + pad > b.x && a.y - pad < bottom(b) && bottom(a) + pad > b.y;
}

/** The smallest rectangle around all of `rs`; callers pass at least one. */
export function union(rs: readonly Rect[]): Rect {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map(right)) - x, h: Math.max(...rs.map(bottom)) - y };
}

/** Does the axis-parallel segment p1-p2 run through the rectangle grown by `pad`? Touching does not count. */
export function segmentHitsRect(p1: Point, p2: Point, r: Rect, pad = 0): boolean {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  return minX < right(r) + pad && maxX > r.x - pad && minY < bottom(r) + pad && maxY > r.y - pad;
}

/** Do a horizontal and a vertical segment really cross, more than half a pixel away from their ends? */
export function segmentsCross(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const aH = a1[1] === a2[1];
  const bH = b1[1] === b2[1];
  if (aH === bH) return false;
  const [h1, h2, v1, v2] = aH ? [a1, a2, b1, b2] : [b1, b2, a1, a2];
  const y = h1[1];
  const x = v1[0];
  const hx1 = Math.min(h1[0], h2[0]);
  const hx2 = Math.max(h1[0], h2[0]);
  const vy1 = Math.min(v1[1], v2[1]);
  const vy2 = Math.max(v1[1], v2[1]);
  return x > hx1 + 0.5 && x < hx2 - 0.5 && y > vy1 + 0.5 && y < vy2 - 0.5;
}

/**
 * The point `dist` pixels along a polyline and the unit direction of its segment there. Past the end it stays
 * on the last segment, so a mark near the end of a short line still lands on the line.
 */
export function pointAlong(points: readonly Point[], dist: number): { readonly p: Point; readonly dir: Point } {
  let remaining = dist;
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i] as Point;
    const [x2, y2] = points[i + 1] as Point;
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dir: Point = [len ? (x2 - x1) / len : 0, len ? (y2 - y1) / len : 0];
    if (remaining <= len || i === points.length - 2) {
      const t = Math.min(remaining, len);
      return { p: [x1 + dir[0] * t, y1 + dir[1] * t], dir };
    }
    remaining -= len;
  }
  return { p: points[0] ?? [0, 0], dir: [1, 0] };
}

/** Sum of the segment lengths of a polyline. */
export function polylineLength(points: readonly Point[]): number {
  let l = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    l += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return l;
}

/** The longest segment of a polyline, the first one on a tie; labels and flow numbers sit on it. */
export function longestSegment(points: readonly Point[]): {
  readonly p1: Point;
  readonly p2: Point;
  readonly len: number;
} {
  let best = 0;
  let bestLen = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as Point;
    const b = points[i + 1] as Point;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len > bestLen) {
      bestLen = len;
      best = i;
    }
  }
  return { p1: points[best] as Point, p2: points[best + 1] as Point, len: bestLen };
}
