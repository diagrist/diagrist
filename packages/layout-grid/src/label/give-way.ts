/** How often the seats are gone through again while one of them still moves. */
const ROUNDS = 3;
/** How many seats of a partner are tried when two texts move together. */
const TRIES = 160;

/** The seats of a spot search so far, by key, and how one is taken out, sought again and put back. */
export interface Seats<T> {
  /** The seat of each key, in the order they were seated. */
  readonly chosen: Map<number, T>;
  /** How near the seat of key `k` comes to the texts of other lines seated now: 0 where it keeps their distance. */
  readonly near: (k: number, seat: T) => number;
  /** What the seat of key `k` meets with it taken out; 0 for a clear spot. */
  readonly cost: (k: number, seat: T) => number;
  /** The best seat of key `k` with it taken out, as the search would seat it now, and what it meets. */
  readonly seek: (k: number) => { readonly seat: T; readonly cost: number };
  /** The clear seats of key `k` with it taken out, in the order the search tries them. */
  readonly ways: (k: number) => Iterable<T>;
  readonly take: (k: number, seat: T) => void;
  readonly drop: (k: number, seat: T) => void;
}

/** Seat `k` sought again alone; true where it moved to a seat that meets less, or as much and comes less near. */
function alone<T>(s: Seats<T>, k: number, seat: T, cleared: number[]): boolean {
  const was = s.near(k, seat);
  s.drop(k, seat);
  const cost = s.cost(k, seat);
  const found = s.seek(k);
  const better = found.cost < cost || (found.cost === cost && s.near(k, found.seat) < was);
  s.take(k, better ? found.seat : seat);
  if (!better) return false;
  s.chosen.set(k, found.seat);
  if (cost > 0 && found.cost === 0) cleared.push(k);
  return true;
}

/**
 * Seat `k` sought again together with a seat `j` it comes near: every clear seat of `j` is tried, `k` sought for it,
 * and the pair that comes least near is kept where it comes less near than before and `k` meets no more. True where
 * the pair moved.
 */
function paired<T>(s: Seats<T>, k: number, seat: T, j: number, other: T): boolean {
  s.drop(k, seat);
  const kept = s.cost(k, seat);
  s.drop(j, other);
  let best: { seat: T; other: T } | undefined;
  let low = s.near(j, other);
  s.take(j, other);
  low += s.near(k, seat);
  s.drop(j, other);
  let tried = 0;
  for (const next of s.ways(j)) {
    if (tried++ >= TRIES || low === 0) break;
    const nj = s.near(j, next);
    if (nj >= low) continue;
    s.take(j, next);
    const found = s.seek(k);
    const sum = nj + s.near(k, found.seat);
    s.drop(j, next);
    if (found.cost <= kept && sum < low) [best, low] = [{ seat: found.seat, other: next }, sum];
  }
  const [mine, theirs] = best ? [best.seat, best.other] : [seat, other];
  s.take(j, theirs);
  s.take(k, mine);
  if (!best) return false;
  s.chosen.set(j, theirs);
  s.chosen.set(k, mine);
  return true;
}

/** The keys whose seats `k`'s seat comes near: those that, taken out, leave it less near. */
function partners<T>(s: Seats<T>, k: number, seat: T): number[] {
  const was = s.near(k, seat);
  return [...s.chosen].flatMap(([j, other]) => {
    if (j === k) return [];
    s.drop(j, other);
    const less = s.near(k, seat) < was;
    s.take(j, other);
    return less ? [j] : [];
  });
}

/**
 * Seats priced together rather than one after the other: a text seated earlier gives way where a text of another
 * line came near it. Each seat that comes near the texts of other lines is taken out and sought again with all others
 * in place, and kept where it meets less, or as much and comes less near, so an earlier text moves aside where that
 * frees both. Where that does not help, it is sought together with each seat it comes near, as two texts that only
 * part when both move. Rounds repeat, at most `ROUNDS`, while a seat moves. Returns the keys whose seats found a
 * clear spot only now.
 */
export function giveWay<T>(seats: Seats<T>): number[] {
  const cleared: number[] = [];
  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;
    for (const k of [...seats.chosen.keys()]) {
      const seat = seats.chosen.get(k) as T;
      if (seats.near(k, seat) === 0) continue;
      if (alone(seats, k, seat, cleared)) moved = true;
      else
        for (const j of partners(seats, k, seat))
          if (paired(seats, k, seats.chosen.get(k) as T, j, seats.chosen.get(j) as T)) {
            moved = true;
            break;
          }
    }
    if (!moved) break;
  }
  return cleared;
}
