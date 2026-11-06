import type { Rect } from '@diagrist/core';
import type { Clear } from './clear.js';
import type { EdgeLabel } from './types.js';

/** How often the seats are gone through again while one of them still moves. */
const ROUNDS = 3;

/** The seats of a spot search so far and how one is sought again: what `giveWay` works on. */
export interface Seats {
  /** The block of texts of each route seated so far, by route, in the order they were seated. */
  readonly chosen: Map<number, EdgeLabel[]>;
  /** The rectangles a block takes in `clear`. */
  readonly rects: (block: readonly EdgeLabel[]) => Rect[];
  /** What a block on route `i` meets, by `clear`; 0 for a clear spot. */
  readonly cost: (block: readonly EdgeLabel[], i: number) => number;
  /** The best block of route `i` with its own texts taken out of `clear`, as the search would seat it now. */
  readonly seek: (i: number) => { readonly block: EdgeLabel[]; readonly cost: number };
}

/**
 * Seats priced together rather than one after the other: a text seated earlier gives way where a text of another
 * line came near it. Each block that comes nearer than `crowding` allows to the texts of other routes is taken out
 * and sought again with all others in place; the new seat is kept where it meets no more and comes less near, so an
 * earlier text moves aside where that frees both. Rounds repeat, at most `ROUNDS`, while a seat moves. Returns the
 * routes whose blocks found a clear spot only now.
 */
export function giveWay(seats: Seats, clear: Clear): number[] {
  const taken = new Map<number, Rect[]>();
  for (const [i, block] of seats.chosen) taken.set(i, seats.rects(block));
  const near = (i: number, rects: readonly Rect[]) => rects.reduce((n, r) => n + clear.crowding(r, i), 0);
  const cleared: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;
    for (const [i, block] of seats.chosen) {
      const rects = taken.get(i) ?? [];
      const was = near(i, rects);
      if (was === 0) continue;
      for (const r of rects) clear.drop(r);
      const cost = seats.cost(block, i);
      const found = seats.seek(i);
      const next = seats.rects(found.block);
      const better = found.cost < cost || (found.cost === cost && near(i, next) < was);
      const keep = better ? next : rects;
      for (const r of keep) clear.take(r, i);
      if (!better) continue;
      seats.chosen.set(i, found.block);
      taken.set(i, next);
      if (cost > 0 && found.cost === 0) cleared.push(i);
      moved = true;
    }
    if (!moved) break;
  }
  return cleared;
}
