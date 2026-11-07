import type { Arrangement } from './arrange.js';
import type { RailSide } from './rail-order.js';
import type { LayeredSpec } from './spec.js';

/** The most rails with a free side whose every combination is drawn; beyond, each is flipped alone. */
const EVERY = 2;

/** Both sides, in the order combinations count them. */
const SIDES: readonly RailSide[] = ['left', 'right'];

/**
 * The arrangements of a picture with other choices of side for the rails that may take either (`Arrangement.rails`
 * with two sides), in pictures with frames or lanes, where a rail's side decides what it passes: every combination
 * of up to `EVERY` such rails, else each of them pinned to the other side alone. `taken` is the side the rail stage
 * gave a rail in the picture laid out already, which is not drawn again. The caller draws each and keeps the
 * cheapest by `scoreOf`; `place` in the rail stage chooses a side by the rails placed before it and those to come,
 * which the whole drawing may overrule.
 */
export function sideChoices(
  spec: LayeredSpec,
  first: Arrangement,
  taken: (rail: string) => RailSide | undefined,
): Arrangement[] {
  const rails = first.rails;
  if (rails === undefined || (spec.frames ?? []).length + (spec.lanes ?? []).length === 0) return [];
  const free = [...rails].filter(([, sides]) => sides.length > 1).map(([id]) => id);
  const pinned = (choice: ReadonlyMap<string, RailSide>): Arrangement => ({
    ...first,
    rails: new Map([...rails].map(([id, sides]) => [id, choice.has(id) ? [choice.get(id) as RailSide] : sides])),
  });
  if (free.length > EVERY)
    return free.flatMap((id) => SIDES.filter((s) => s !== taken(id)).map((s) => pinned(new Map([[id, s]]))));
  const out: Arrangement[] = [];
  for (let mask = 0; mask < 1 << free.length && free.length > 0; mask++) {
    const choice = new Map(free.map((id, i) => [id, SIDES[(mask >> i) & 1] as RailSide]));
    if (free.some((id) => choice.get(id) !== taken(id))) out.push(pinned(choice));
  }
  return out;
}
