import { scoreOf } from '../score.js';
import { arrange, arrangeHub, planHub } from './arrange.js';
import { finish, type LayeredLayout } from './finish.js';
import type { Side } from './hub.js';
import { layeredLines } from './output.js';
import type { LayeredSpec } from './spec.js';

export type { LayeredLayout } from './finish.js';

/**
 * Rounds of the search for the sides of a hub's extensions: each round tries every other side of every one, and of
 * every two together, and takes the cheapest.
 */
const ROUNDS = 4;

/**
 * Lays out a layered picture (plan L2–L4): layers with placeholders, an order that weighs crossings, positions with
 * real widths, fans and joins, ports, tracks per gap, routes and one label per line or trunk. A hub docks its
 * extensions at the sides of its core: starting from the first guess, each round lays out every arrangement that
 * moves one extension, or two together, to another side it may take, and the cheapest by `scoreOf` stays while it
 * costs less. Moving two at once finds pictures that a step of one alone, costing more, would not reach.
 */
export function layoutLayered(spec: LayeredSpec): LayeredLayout {
  const hub = spec.hub;
  if (hub === undefined) return finish(spec, arrange(spec));
  const plan = planHub(spec, hub.core);
  const sides = [...plan.first];
  const priced = (s: readonly Side[]) => {
    const layout = finish(spec, arrangeHub(spec, plan, s));
    return { layout, cost: scoreOf(layeredLines(spec, layout)).cost };
  };
  const seen = new Map<string, ReturnType<typeof priced>>();
  const price = (tried: readonly Side[]) => {
    const key = tried.join(',');
    const known = seen.get(key) ?? priced(tried);
    seen.set(key, known);
    return known;
  };
  let best = price(sides);
  const neighbours = (): Side[][] => {
    const singles = plan.parts.flatMap((part, i) =>
      part.sides.filter((s) => s !== sides[i]).map((s) => sides.map((t, k) => (k === i ? s : t))),
    );
    const pairs = plan.parts.flatMap((a, i) =>
      plan.parts.flatMap((b, j) =>
        j <= i
          ? []
          : a.sides
              .filter((sa) => sa !== sides[i])
              .flatMap((sa) =>
                b.sides
                  .filter((sb) => sb !== sides[j])
                  .map((sb) => sides.map((t, k) => (k === i ? sa : k === j ? sb : t))),
              ),
      ),
    );
    return [...singles, ...pairs];
  };
  for (let round = 0; round < ROUNDS; round++) {
    const options = neighbours().map((tried) => ({ tried, ...price(tried) }));
    const next = options.reduce((a, b) => (b.cost < a.cost ? b : a), { tried: [...sides], ...best });
    if (next.cost >= best.cost) break;
    best = next;
    sides.splice(0, sides.length, ...next.tried);
  }
  return best.layout;
}
