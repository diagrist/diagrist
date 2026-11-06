import { linesOfLaid, scoreOf } from '../score.js';
import { arrange, arrangeHub, planHub } from './arrange.js';
import { finish, type LayeredLayout } from './finish.js';
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
  if (hub === undefined) return finish(spec, arrange(spec));
  const plan = planHub(spec, hub.core);
  const ends = new Map(spec.edges.map((e) => [e.id, [e.from, e.to] as const]));
  const sides = [...plan.first];
  const priced = (s: readonly (typeof sides)[number][]) => {
    const layout = finish(spec, arrangeHub(spec, plan, s));
    return { layout, cost: scoreOf(linesOf(layout, ends)).cost };
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

/** The lines of a laid out picture with the ends of its edges, the frames and the head of its core. */
function linesOf(layout: LayeredLayout, ends: ReadonlyMap<string, readonly [string, string]>) {
  const core = layout.frame === undefined ? [] : [{ id: 'core', rect: layout.frame.rect, head: layout.frame.head.box }];
  return linesOfLaid({
    nodes: layout.nodes,
    routes: layout.routes,
    ends: layout.routes.map((r) => ends.get(r.edge) ?? ['', '']),
    labels: layout.labels,
    frames: [...core, ...(layout.frames ?? [])],
    width: layout.width,
    height: layout.bottom,
  });
}
