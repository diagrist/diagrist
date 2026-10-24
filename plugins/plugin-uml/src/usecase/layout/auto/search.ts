import type { Actor } from '../../diagram.js';
import { families, type Parts, type Side } from './parts.js';
import { badness, blocks, type Frame, reslot } from './swap.js';

/** Up to this many blocks the search tries every order of a column (6! = 720). */
const MAX_BLOCKS = 6;

/** All orders in which the subjects do not get mixed up. */
function* orders<T>(items: readonly T[], band: (t: T) => string): Generator<T[]> {
  if (items.length <= 1) {
    yield [...items];
    return;
  }
  for (const [i, first] of items.entries()) {
    const rest = items.filter((_, k) => k !== i);
    for (const tail of orders(rest, band)) {
      const order = [first, ...tail];
      if (order.every((b, k) => k === 0 || band(order[k - 1] as T) <= band(b))) yield order;
    }
  }
}

/**
 * When lines still cross after barycentre and swaps, the search tries every order of the blocks of each small
 * column; `settle` orders the other columns and the actors to it. The first order with the fewest crossings wins.
 */
export function permuteImprove(
  f: Frame,
  pos: Map<string, number>,
  column: (c: number) => string[],
  key: (id: string) => string,
  settle: (column: number) => void,
): void {
  let best = badness(f, pos);
  const band = (b: readonly string[]) =>
    key(b[0] ?? '')
      .split('|')[0]
      ?.padStart(4, '0') ?? '';
  for (let c = 0; c < f.columns && best > 0; c++) {
    const list = blocks(column(c), pos, key);
    if (list.length < 3 || list.length > MAX_BLOCKS) continue;
    const start = new Map(pos);
    let winner = start;
    for (const order of orders(list, band)) {
      for (const [id, v] of start) pos.set(id, v);
      reslot(order, pos);
      settle(c);
      const now = badness(f, pos);
      if (now < best) {
        best = now;
        winner = new Map(pos);
        if (!best) break;
      }
    }
    for (const [id, v] of winner) pos.set(id, v);
  }
}

/** A solved arrangement: how bad it is and with which sides. */
interface Solved {
  readonly bad: number;
  readonly side: ReadonlyMap<string, Side>;
}

/**
 * Families of actors without a given or fixed side try the other side; when it crosses less there, the change
 * stays. In turn, until nothing improves.
 */
export function flipFamilies<T extends Solved>(
  p: Parts,
  side: ReadonlyMap<string, Side>,
  first: T,
  solve: (side: Map<string, Side>) => T,
  fixed: ReadonlySet<string> = new Set(),
): T {
  let best = first;
  const byId = new Map<string, Actor>(p.actors.map((a) => [a.id, a]));
  const free = families(p).filter((members) =>
    members.every((id) => byId.get(id)?.side === undefined && !fixed.has(id)),
  );
  for (let improved = true; improved && best.bad > 0; ) {
    improved = false;
    for (const members of free) {
      const trial = new Map(best.side ?? side);
      for (const id of members) trial.set(id, trial.get(id) === 'left' ? 'right' : 'left');
      const got = solve(trial);
      if (got.bad < best.bad) {
        best = got;
        improved = true;
      }
    }
  }
  return best;
}
