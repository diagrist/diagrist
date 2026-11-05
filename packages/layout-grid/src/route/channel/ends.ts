import type { Side } from '../../geometry.js';
import type { Box } from '../boxes.js';
import type { Plan } from '../grid.js';
import { type Range, sideOf } from './free.js';
import type { Car } from './train.js';

export const flat = (side: Side): boolean => side === 'top' || side === 'bottom';
export const middle = ([a, b]: Range): number => (a + b) / 2;

/** One end of a planned edge on a side of its box. */
export interface End extends Car {
  readonly plan: Plan;
  readonly at: 'from' | 'to';
  readonly box: Box;
  readonly side: Side;
}

const pairOf = (p: Plan): string => [p.a.id, p.b.id].sort().join('|');

/** Both ends of a plan. */
export const endsOf = (p: Plan): End[] => [
  { plan: p, at: 'from', box: p.a, side: p.fromSide, other: middle(sideOf(p.b, p.fromSide)), pair: pairOf(p) },
  { plan: p, at: 'to', box: p.b, side: p.toSide, other: middle(sideOf(p.a, p.toSide)), pair: pairOf(p) },
];

/** How far the other box of an end lies out from its side, across the side. */
function beyond(e: End): number {
  const other = e.at === 'from' ? e.plan.b : e.plan.a;
  const across: Side = flat(e.side) ? 'left' : 'top';
  return Math.abs(middle(sideOf(other, across)) - middle(sideOf(e.box, across)));
}

/**
 * Order of the ends on one side: by where their other box lies; of two Ls that turn the same way, the one that
 * reaches further out first in the direction of the turn, so the two nest instead of crossing; nested Ls and parallel
 * Zs between the same boxes.
 */
export function byOther(e: End, f: End): number {
  if (e.other !== f.other) return e.other - f.other;
  if (e.plan.shape === 'L' && f.plan.shape === 'L') {
    const later = e.other >= middle(sideOf(e.box, e.side)) ? 1 : -1;
    const apart = later * (beyond(f) - beyond(e));
    if (apart !== 0) return apart;
  }
  const sign = (x: End) => (x.plan.shape === 'L' && x.other < middle(sideOf(x.box, x.side)) ? -1 : 1);
  return (e.plan.key - f.plan.key) * sign(e);
}
