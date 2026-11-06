/** How often the seats are gone through again while one of them still moves. */
const ROUNDS = 3;

/** The seats of a spot search so far, by key, and how one is taken out, sought again and put back. */
export interface Seats<T> {
  /** The seat of each key, in the order they were seated. */
  readonly chosen: Map<number, T>;
  /** How near the seat of key `k` comes to the texts of other lines: 0 where it keeps their distance. */
  readonly near: (k: number, seat: T) => number;
  /** What the seat of key `k` meets with it taken out; 0 for a clear spot. */
  readonly cost: (k: number, seat: T) => number;
  /** The best seat of key `k` with it taken out, as the search would seat it now, and what it meets. */
  readonly seek: (k: number) => { readonly seat: T; readonly cost: number };
  readonly take: (k: number, seat: T) => void;
  readonly drop: (k: number, seat: T) => void;
}

/**
 * Seats priced together rather than one after the other: a text seated earlier gives way where a text of another
 * line came near it. Each seat that comes near the texts of other lines is taken out and sought again with all others
 * in place; the new seat is kept where it meets less, or as much and comes less near, so an earlier text moves aside
 * where that frees both. Rounds repeat, at most `ROUNDS`, while a seat moves. Returns the keys whose seats found a
 * clear spot only now.
 */
export function giveWay<T>(seats: Seats<T>): number[] {
  const cleared: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;
    for (const [k, seat] of seats.chosen) {
      const was = seats.near(k, seat);
      if (was === 0) continue;
      seats.drop(k, seat);
      const cost = seats.cost(k, seat);
      const found = seats.seek(k);
      const better = found.cost < cost || (found.cost === cost && seats.near(k, found.seat) < was);
      seats.take(k, better ? found.seat : seat);
      if (!better) continue;
      seats.chosen.set(k, found.seat);
      if (cost > 0 && found.cost === 0) cleared.push(k);
      moved = true;
    }
    if (!moved) break;
  }
  return cleared;
}
