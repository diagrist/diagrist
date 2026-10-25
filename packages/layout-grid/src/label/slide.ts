import type { Point, Rect } from '@diagrist/core';
import { overlaps, union } from '../geometry.js';
import type { OnLine } from './on-line.js';
import type { EdgeLabel } from './types.js';

/** The step a block slides by along its segment. */
const STEP = 2;

const shifted = (l: EdgeLabel, along: 0 | 1, by: number): EdgeLabel =>
  along === 0
    ? { ...l, x: l.x + by, box: { ...l.box, x: l.box.x + by } }
    : { ...l, y: l.y + by, box: { ...l.box, y: l.box.y + by } };

/**
 * The texts of one route moved along their segment by the smallest step, either way, after which their block grown
 * by `pad` meets no rectangle of `avoid` and still lies within the ends of the segment; unmoved when they are clear
 * already, `undefined` when no step clears them.
 */
export function slideClear(
  labels: readonly EdgeLabel[],
  [p1, p2]: readonly [Point, Point],
  { pad, avoid }: OnLine,
): EdgeLabel[] | undefined {
  if (labels.length === 0) return [];
  const u = union(labels.map((l) => l.box));
  const along = p1[1] === p2[1] ? 0 : 1;
  const block: Rect = { x: u.x - pad.x, y: u.y - pad.y, w: u.w + 2 * pad.x, h: u.h + 2 * pad.y };
  const clear = (by: number) =>
    !avoid.some((r) => overlaps(along === 0 ? { ...block, x: block.x + by } : { ...block, y: block.y + by }, r));
  const low = along === 0 ? block.x : block.y;
  const high = low + (along === 0 ? block.w : block.h);
  const ends = [Math.min(p1[along], p2[along]), Math.max(p1[along], p2[along])] as const;
  const fits = (by: number) => low + by >= ends[0] && high + by <= ends[1];
  if (clear(0)) return [...labels];
  for (let by = STEP; low - by >= ends[0] || high + by <= ends[1]; by += STEP) {
    const step = [by, -by].find((d) => fits(d) && clear(d));
    if (step !== undefined) return labels.map((l) => shifted(l, along, step));
  }
  return undefined;
}
