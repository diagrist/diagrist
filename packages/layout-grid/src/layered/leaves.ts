import { layerGraph } from '../layers/index.js';
import { framedChoices } from '../layers/nest.js';
import { scoreOf } from '../score.js';
import { laidOut } from './detour.js';
import type { LayeredLayout } from './finish.js';
import { anchorFrameEnds, released } from './frame-ends.js';
import { layeredLines } from './output.js';
import type { LayeredSpec } from './spec.js';

/** Rounds of the search for where leaf frames and round trips stand; each round tries every other place of each. */
const ROUNDS = 3;

/** Where the leaf frames stand by their partner, and which round trips stand beside their frame. */
interface Choice {
  readonly moves: ReadonlyMap<string, -1 | 0 | 1>;
  readonly trips: ReadonlySet<string>;
}

/**
 * Lays out a picture layered by `spec.layering`: first with every leaf frame where packing puts it and every round
 * trip below its frame, then, round by round, with one leaf frame moved beside its partner, above it or below it, or
 * one round trip moved beside its frame's last layer or back below it (`LayerGraph.trips`), and the cheapest picture
 * by `scoreOf` stays while it costs less. Two tries that give the same layers are laid out once.
 */
export function layoutLeaves(spec: LayeredSpec, graph: NonNullable<LayeredSpec['layering']>): LayeredLayout {
  const seen = new Map<string, { layout: LayeredLayout; cost: number }>();
  const price = ({ moves, trips }: Choice) => {
    const tried = { ...graph, ...(moves.size > 0 ? { moves } : {}), ...(trips.size > 0 ? { trips } : {}) };
    const layers = layerGraph(tried).layers.map((layer) => [...layer]);
    const key = JSON.stringify(layers);
    const known = seen.get(key);
    if (known) return known;
    const anchored = anchorFrameEnds({ ...spec, layers, reorder: true }, layers);
    const layout = laidOut(anchored.spec, (l) => released(spec, l, anchored.ends), spec);
    const priced = { layout, cost: scoreOf(layeredLines(spec, layout)).cost };
    seen.set(key, priced);
    return priced;
  };
  let choice: Choice = { moves: new Map(), trips: new Set() };
  let best = price(choice);
  const { leaves, trips } = framedChoices(graph);
  for (let round = 0; round < ROUNDS && leaves.length + trips.length > 0; round++) {
    const { moves } = choice;
    const toggled = (t: string) =>
      choice.trips.has(t) ? [...choice.trips].filter((u) => u !== t) : [...choice.trips, t];
    const tries: Choice[] = [
      ...leaves.flatMap((leaf) =>
        ([-1, 0, 1] as const)
          .filter((d) => moves.get(leaf) !== d)
          .map((d) => ({ ...choice, moves: new Map([...moves, [leaf, d]]) })),
      ),
      ...trips.map((t) => ({ ...choice, trips: new Set(toggled(t)) })),
    ];
    const next = tries
      .map((tried) => ({ tried, ...price(tried) }))
      .reduce((a, b) => (b.cost < a.cost ? b : a), {
        tried: choice,
        ...best,
      });
    if (next.cost >= best.cost) break;
    [best, choice] = [next, next.tried];
  }
  return best.layout;
}
