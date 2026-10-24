import type { Point, Rect } from '@diagrist/core';

/** Does the axis-parallel segment p1-p2 run through the rectangle grown by `pad`? Touching does not count. */
export function segmentHitsRect(p1: Point, p2: Point, r: Rect, pad = 0): boolean {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  return (
    Math.min(x1, x2) < r.x + r.w + pad &&
    Math.max(x1, x2) > r.x - pad &&
    Math.min(y1, y2) < r.y + r.h + pad &&
    Math.max(y1, y2) > r.y - pad
  );
}

/** Does any segment of any of the lines run through the rectangle grown by `pad`? */
export const linesHit = (lines: readonly (readonly Point[])[], r: Rect, pad: number): boolean =>
  lines.some((p) => p.slice(1).some((q, i) => segmentHitsRect(p[i] as Point, q, r, pad)));
