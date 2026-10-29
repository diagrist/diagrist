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
 * The route drawn by hand between two boxes one above the other: out of the middle of one side, across halfway
 * between them, into the middle of the facing side. The crossing moves by `gap` while it runs along another route;
 * undefined when the ends do not face each other or a box stands in the way.
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
  if (!vertical(fromSide) || !vertical(toSide) || fromSide === toSide) return undefined;
  const down = fromSide === 'bottom';
  if (down ? start[1] + 2 * gap > end[1] : start[1] - 2 * gap < end[1]) return undefined;
  if (start[0] === end[0]) return undefined;
  const top = Math.min(start[1], end[1]) + gap;
  const bottom = Math.max(start[1], end[1]) - gap;
  const middle = (start[1] + end[1]) / 2;
  const tries = [0, 1, -1, 2, -2].map((k) => middle + k * gap).filter((y) => y >= top && y <= bottom);
  for (const y of tries) {
    const points: Point[] = [start, [start[0], y], [end[0], y], end];
    const free = points
      .slice(1)
      .every((q, i) => !blocks.some((rect) => segmentHitsRect(points[i] as Point, q, rect, gap / 2)));
    if (free && !alongUsed(y, start[0], end[0], used, gap)) return points;
  }
  return undefined;
}
