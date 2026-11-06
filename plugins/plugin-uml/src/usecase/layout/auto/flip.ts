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
 * picture costs less there by the measure of the line check, the change stays. In turn, until nothing improves.
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
  for (let improved = true; improved && !best.clean; ) {
    improved = false;
    for (const members of free) {
      const trial = new Map(best.side);
      for (const id of members) trial.set(id, trial.get(id) === 'left' ? 'right' : 'left');
      const got = run(trial);
      if (got.cost < best.cost) {
        best = got;
        improved = true;
      }
    }
  }
  return best;
}
