import { layerGraph } from '../layers/index.js';
import { framedLeaves } from '../layers/nest.js';
import { scoreOf } from '../score.js';
import { arrange } from './arrange.js';
import { finish, type LayeredLayout } from './finish.js';
import { anchorFrameEnds, released } from './frame-ends.js';
import { layeredLines } from './output.js';
import type { LayeredSpec } from './spec.js';

/** Rounds of the search for where leaf frames stand; each round tries every other place of every one. */
const ROUNDS = 3;

type Moves = ReadonlyMap<string, -1 | 0 | 1>;

/**
 * Lays out a picture layered by `spec.layering`: first with every leaf frame where packing puts it, then, round by
 * round, with one leaf frame moved beside its partner, above it or below it, and the cheapest picture by `scoreOf`
 * stays while it costs less. Two tries that give the same layers are laid out once.
 */
export function layoutLeaves(spec: LayeredSpec, graph: NonNullable<LayeredSpec['layering']>): LayeredLayout {
  const seen = new Map<string, { layout: LayeredLayout; cost: number }>();
  const price = (moves: Moves) => {
    const layers = layerGraph(moves.size > 0 ? { ...graph, moves } : graph).layers.map((layer) => [...layer]);
    const key = JSON.stringify(layers);
    const known = seen.get(key);
    if (known) return known;
    const anchored = anchorFrameEnds({ ...spec, layers, reorder: true }, layers);
    const layout = released(spec, finish(anchored.spec, arrange(anchored.spec)), anchored.ends);
    const priced = { layout, cost: scoreOf(layeredLines(spec, layout)).cost };
    seen.set(key, priced);
    return priced;
  };
  let moves: Moves = new Map();
  let best = price(moves);
  const leaves = framedLeaves(graph);
  for (let round = 0; round < ROUNDS && leaves.length > 0; round++) {
    const tries = leaves.flatMap((leaf) =>
      ([-1, 0, 1] as const).filter((d) => moves.get(leaf) !== d).map((d) => new Map([...moves, [leaf, d]])),
    );
    const next = tries
      .map((tried) => ({ tried, ...price(tried) }))
      .reduce((a, b) => (b.cost < a.cost ? b : a), {
        tried: moves,
        ...best,
      });
    if (next.cost >= best.cost) break;
    [best, moves] = [next, next.tried];
  }
  return best.layout;
}
