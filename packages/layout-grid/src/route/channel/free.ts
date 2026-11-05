import type { Side } from '../../geometry.js';
import type { Board, Box } from '../boxes.js';
import { reservedOn } from '../reserve.js';

/** A stretch along a side, from its lower to its higher coordinate. */
export type Range = readonly [number, number];

const flat = (side: Side): boolean => side === 'top' || side === 'bottom';

/** Where a side starts and how long it is, along its own axis. */
export function sideOf(box: Box, side: Side): Range {
  const r = box.rect;
  return flat(side) ? [r.x, r.x + r.w] : [r.y, r.y + r.h];
}

/**
 * Where ends may stand on a side: `gap / 2` inside its corners, at most a quarter of the side, and `gap` clear of a
 * reserved stretch (`GridNode.reserve`). A side reserved all along has no free stretch.
 */
export function freeOf(board: Board, box: Box, side: Side, gap: number): Range[] {
  const [lo, hi] = sideOf(box, side);
  const inset = Math.min(gap / 2, (hi - lo) / 4);
  const whole: Range = [lo + inset, hi - inset];
  const reserved = reservedOn(board.node(box.id), box.rect, side);
  if (!reserved) return [whole];
  const parts: Range[] = [
    [whole[0], Math.min(whole[1], reserved[0] - gap)],
    [Math.max(whole[0], reserved[1] + gap), whole[1]],
  ];
  return parts.filter(([a, b]) => b >= a);
}

/** The stretches both lists share. */
export function intersect(a: readonly Range[], b: readonly Range[]): Range[] {
  return a.flatMap(([a0, a1]) =>
    b.flatMap(([b0, b1]): Range[] => {
      const lo = Math.max(a0, b0);
      const hi = Math.min(a1, b1);
      return hi >= lo ? [[lo, hi]] : [];
    }),
  );
}

export const within = (v: number, ranges: readonly Range[]): boolean => ranges.some(([a, b]) => v >= a && v <= b);

/** The point of `ranges` nearest to `v`, the lower one on a tie; `undefined` without ranges. */
export function nearest(v: number, ranges: readonly Range[]): number | undefined {
  let best: number | undefined;
  for (const [a, b] of ranges) {
    const p = Math.min(b, Math.max(a, v));
    if (best === undefined || Math.abs(p - v) < Math.abs(best - v)) best = p;
  }
  return best;
}
