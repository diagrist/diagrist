import { scoreOf } from '../score.js';
import { type Arrangement, arrange, arrangeHub, planHub } from './arrange.js';
import { besideRoutes } from './beside.js';
import { finish, type LayeredLayout } from './finish.js';
import { layeredLines } from './output.js';
import type { LayeredSpec } from './spec.js';

export type { LayeredLayout } from './finish.js';

/** Rounds of the search for the sides of a hub's extensions: each round tries every other side of every one. */
const ROUNDS = 3;

/**
 * Lays out a layered picture (plan L2–L4): layers with placeholders, an order that weighs crossings, positions with
 * real widths, fans and joins, ports, tracks per gap, routes and one label per line or trunk. A hub docks its
 * extensions at the sides of its core: starting from the first guess, each extension tries every other side it
 * may take, and a change stays when the whole picture costs less by `scoreOf`.
 */
export function layoutLayered(spec: LayeredSpec): LayeredLayout {
  const hub = spec.hub;
  if (hub === undefined) return bentAside(spec, arrange(spec));
  const plan = planHub(spec, hub.core);
  const sides = [...plan.first];
  const priced = (s: readonly (typeof sides)[number][]) => {
    const layout = finish(spec, arrangeHub(spec, plan, s));
    return { layout, cost: scoreOf(layeredLines(spec, layout)).cost };
  };
  let best = priced(sides);
  for (let round = 0, better = true; round < ROUNDS && better; round++) {
    better = false;
    plan.parts.forEach((part, i) => {
      for (const side of part.sides) {
        if (side === sides[i]) continue;
        const tried = [...sides];
        tried[i] = side;
        const next = priced(tried);
        if (next.cost < best.cost) {
          best = next;
          sides[i] = side;
          better = true;
        }
      }
    });
  }
  return best.layout;
}

/**
 * A plain picture with each line beside its layer that is no neighbours' bent the way that costs less by
 * `scoreOf`: below the layer, as the first guess, or above it (layout plan R3), tried one line after the other.
 */
function bentAside(spec: LayeredSpec, arrangement: Arrangement): LayeredLayout {
  let best = finish(spec, arrangement);
  const around = besideRoutes(arrangement.ranked, arrangement.layers).around;
  if (around.length === 0) return best;
  let cost = scoreOf(layeredLines(spec, best)).cost;
  const up = new Set<string>();
  for (const id of around) {
    const tried = new Set([...up, id]);
    const next = finish(spec, arrangement, tried);
    const priced = scoreOf(layeredLines(spec, next)).cost;
    if (priced >= cost) continue;
    [best, cost] = [next, priced];
    up.add(id);
  }
  return best;
}
