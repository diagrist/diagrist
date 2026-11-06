import type { Actor } from '../../diagram.js';
import { families, type Parts, type Side } from './parts.js';

/** A laid out arrangement: its sides, what it costs and whether it is clean. */
export interface Priced {
  readonly side: ReadonlyMap<string, Side>;
  readonly cost: number;
  readonly clean: boolean;
}

/**
 * Families of actors without a given or fixed side try the other side while the picture is not clean; when the
 * picture costs less there by the measure of the line check, the change stays. In turn, until nothing improves; where
 * no family alone improves it, two change sides together, since one may only clear the lane the other needs, where
 * that takes fewer layouts than flips of one: with two families, one pair. Sides tried before are not laid out again.
 */
export function flipFamilies<T extends Priced>(
  p: Parts,
  first: T,
  run: (side: Map<string, Side>) => T,
  fixed: ReadonlySet<string> = new Set(),
): T {
  let best = first;
  const byId = new Map<string, Actor>(p.actors.map((a) => [a.id, a]));
  const free = families(p).filter((members) =>
    members.every((id) => byId.get(id)?.side === undefined && !fixed.has(id)),
  );
  const keyOf = (side: ReadonlyMap<string, Side>) =>
    [...side]
      .map(([id, s]) => `${id}:${s}`)
      .sort()
      .join(' ');
  const seen = new Map<string, T>([[keyOf(first.side), first]]);
  const flipped = (moved: readonly (readonly string[])[]) => {
    const trial = new Map(best.side);
    for (const id of moved.flat()) trial.set(id, trial.get(id) === 'left' ? 'right' : 'left');
    const key = keyOf(trial);
    const got = seen.get(key) ?? run(trial);
    seen.set(key, got);
    return got;
  };
  const all = free.flatMap((a, i) => free.slice(i + 1).map((b) => [a, b]));
  const pairs = all.length < free.length ? all : [];
  for (let improved = true; improved && !best.clean; ) {
    improved = false;
    for (const moved of [...free.map((f) => [f]), ...pairs]) {
      if (improved && moved.length > 1) break;
      const got = flipped(moved);
      if (got.cost < best.cost) {
        best = got;
        improved = true;
      }
    }
  }
  return best;
}
