import type { Point, Rect } from '@diagrist/core';

/** Does the segment meet the rectangle grown by `pad`? Exact for slanted segments too (Liang-Barsky). */
export function segmentMeetsRect(p1: Point, p2: Point, r: Rect, pad = 0): boolean {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  let lo = 0;
  let hi = 1;
  const edges: [number, number][] = [
    [-dx, p1[0] - (r.x - pad)],
    [dx, r.x + r.w + pad - p1[0]],
    [-dy, p1[1] - (r.y - pad)],
    [dy, r.y + r.h + pad - p1[1]],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo > hi) return false;
  }
  return true;
}

/** Do two segments in any direction really cross, not only touch at an end? */
export function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const d1 = cross(b1, b2, a1);
  const d2 = cross(b1, b2, a2);
  const d3 = cross(a1, a2, b1);
  const d4 = cross(a1, a2, b2);
  const eps = 1e-6;
  return ((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps));
}

/** Does the segment run through the ellipse (centre, half axes) grown by `pad`? */
export function segmentMeetsEllipse(p1: Point, p2: Point, c: Point, rx: number, ry: number, pad = 0): boolean {
  const a = rx + pad;
  const b = ry + pad;
  const x1 = (p1[0] - c[0]) / a;
  const y1 = (p1[1] - c[1]) / b;
  const dx = (p2[0] - p1[0]) / a;
  const dy = (p2[1] - p1[1]) / b;
  const qa = dx * dx + dy * dy;
  if (qa === 0) return x1 * x1 + y1 * y1 < 1;
  const t = Math.max(0, Math.min(1, -(x1 * dx + y1 * dy) / qa));
  const nx = x1 + dx * t;
  const ny = y1 + dy * t;
  return nx * nx + ny * ny < 1;
}
