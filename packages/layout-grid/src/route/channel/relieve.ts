import { cx, cy, type Side } from '../../geometry.js';
import { type Board, type Box, obstaclesFor } from '../boxes.js';
import type { Plan } from '../grid.js';
import { freeZigzag, type Lane } from '../shape.js';
import { freeOf } from './free.js';
import { leaves } from './inside.js';

const sideKey = (id: string, side: Side): string => `${id}|${side}`;

/** How long the free stretches of the side of an end are, together. */
function room(board: Board, p: Plan, at: 'from' | 'to', gap: number): number {
  const free = freeOf(board, at === 'from' ? p.a : p.b, at === 'from' ? p.fromSide : p.toSide, gap);
  return free.reduce((n, [lo, hi]) => n + hi - lo, 0);
}

/**
 * The length the ends of every side ask: straight ends stand around its middle, twice `spread` apart, and the bent
 * ends beside them towards their other box, `spread` apart; the side must hold the longer half twice.
 */
function demand(plans: readonly Plan[], spread: number): Map<string, number> {
  const sides = new Map<string, { straight: number; before: number; after: number }>();
  const add = (box: Box, side: Side, other: Box, straight: boolean) => {
    const k = sideKey(box.id, side);
    const s = sides.get(k) ?? { straight: 0, before: 0, after: 0 };
    const flat = side === 'top' || side === 'bottom';
    const early = flat ? cx(other.rect) < cx(box.rect) : cy(other.rect) < cy(box.rect);
    sides.set(k, {
      straight: s.straight + (straight ? 1 : 0),
      before: s.before + (!straight && early ? 1 : 0),
      after: s.after + (!straight && !early ? 1 : 0),
    });
  };
  for (const p of plans) {
    add(p.a, p.fromSide, p.b, p.shape === 'straight');
    add(p.b, p.toSide, p.a, p.shape === 'straight');
  }
  const out = new Map<string, number>();
  for (const [k, s] of sides) {
    const half =
      s.straight > 0
        ? (s.straight - 1) * spread + Math.max(s.before, s.after) * spread
        : ((s.before + s.after - 1) * spread) / 2;
    out.set(k, 2 * half);
  }
  return out;
}

/**
 * The other gap a Z between two boxes of one column or row may take: the one on the far side of the boxes, between
 * their neighbours before or after them.
 */
function otherLane(board: Board, p: Plan): Lane | undefined {
  const lane = p.lane;
  if (p.shape !== 'Z' || !lane) return undefined;
  const col = lane.axis === 'col';
  const [ia, ib] = col ? [p.a.colIndex, p.b.colIndex] : [p.a.rowIndex, p.b.rowIndex];
  const [ja, jb] = col ? [p.a.rowIndex, p.b.rowIndex] : [p.a.colIndex, p.b.colIndex];
  const gutters = board.layout.gutters;
  if (ia !== ib) {
    if (ja === jb || ja < 0 || jb < 0) return undefined;
    const index = Math.min(ja, jb);
    const at = (col ? gutters.rows : gutters.cols)[index];
    return at === undefined ? undefined : { axis: col ? 'row' : 'col', index, at, dir: ja < jb ? 1 : -1 };
  }
  const index = lane.index === ia ? ia - 1 : ia;
  const at = (col ? gutters.cols : gutters.rows)[index];
  return at === undefined ? undefined : { axis: lane.axis, index, at, dir: lane.index === ia ? -1 : 1 };
}

/**
 * Zs that crowd a side with more ends than its free stretches hold `spread` apart take another gap where both new
 * sides have room and the Z runs through nothing, last declared first, until the crowded side holds its ends: a Z
 * between two boxes of one column or row the gap on the other side of them, any other Z the gap across, unless that
 * gap lies outside a frame holding both boxes.
 */
export function relieve(board: Board, plans: readonly Plan[], spread: number, gap: number): Plan[] {
  const out = [...plans];
  const over = (list: readonly Plan[], p: Plan, at: 'from' | 'to') => {
    const k = at === 'from' ? sideKey(p.a.id, p.fromSide) : sideKey(p.b.id, p.toSide);
    return (demand(list, spread).get(k) ?? 0) > room(board, p, at, gap);
  };
  for (let i = out.length - 1; i >= 0; i--) {
    const p = out[i] as Plan;
    const lane = otherLane(board, p);
    if (!lane || !(over(out, p, 'from') || over(out, p, 'to'))) continue;
    const sides = freeZigzag(p.a, p.b, lane, obstaclesFor(board, p.edge, true));
    if (!sides || leaves(board, p, lane)) continue;
    const moved: Plan = { ...p, fromSide: sides.fromSide, toSide: sides.toSide, lane };
    const next = out.map((q) => (q === p ? moved : q));
    if (over(next, moved, 'from') || over(next, moved, 'to')) continue;
    out[i] = moved;
  }
  return out;
}
