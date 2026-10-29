import type { Point, Rect } from '@diagrist/core';
import { type Side, segmentHitsRect } from '../geometry.js';

const vertical = (side: Side) => side === 'top' || side === 'bottom';

/** Whether a horizontal segment at `y` from `x1` to `x2` runs along a horizontal part of a laid route. */
function alongUsed(y: number, x1: number, x2: number, used: readonly (readonly Point[])[], gap: number): boolean {
  const [lo, hi] = x1 < x2 ? [x1, x2] : [x2, x1];
  return used.some((points) =>
    points.slice(1).some((q, i) => {
      const p = points[i] as Point;
      if (p[1] !== q[1] || Math.abs(p[1] - y) >= gap) return false;
      return Math.min(hi, Math.max(p[0], q[0])) - Math.max(lo, Math.min(p[0], q[0])) > 0;
    }),
  );
}

/**
 * The route drawn by hand between two boxes one above the other or side by side: out of the middle of one side,
 * across halfway between them, into the middle of the facing side. The crossing moves by `gap` while it runs along
 * another route; undefined when the ends do not face each other or a box stands in the way.
 */
export function zRoute(
  start: Point,
  end: Point,
  sides: readonly [Side, Side],
  blocks: readonly Rect[],
  used: readonly (readonly Point[])[],
  gap: number,
): Point[] | undefined {
  const [fromSide, toSide] = sides;
  if (vertical(fromSide) !== vertical(toSide) || fromSide === toSide) return undefined;
  const flip = !vertical(fromSide);
  const swap = ([x, y]: Point): Point => (flip ? [y, x] : [x, y]);
  const [s, e] = [swap(start), swap(end)];
  const forward = fromSide === 'bottom' || fromSide === 'right';
  if (forward ? s[1] + 2 * gap > e[1] : s[1] - 2 * gap < e[1]) return undefined;
  if (s[0] === e[0]) return undefined;
  const low = Math.min(s[1], e[1]) + gap;
  const high = Math.max(s[1], e[1]) - gap;
  const middle = (s[1] + e[1]) / 2;
  const tries = [0, 1, -1, 2, -2].map((k) => middle + k * gap).filter((y) => y >= low && y <= high);
  const laid = used.map((points) => points.map(swap));
  for (const y of tries) {
    const points = [s, [s[0], y], [e[0], y], e].map((p) => swap(p as Point));
    const free = points
      .slice(1)
      .every((q, i) => !blocks.some((rect) => segmentHitsRect(points[i] as Point, q, rect, gap / 2)));
    if (free && !alongUsed(y, s[0], e[0], laid, gap)) return points;
  }
  return undefined;
}
