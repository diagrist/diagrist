import { orderLayers, refine } from '../layers/order.js';
import type { OrderCost } from '../layers/sift.js';
import { chainsAside } from './chains.js';
import { clustered, framesBroken } from './clusters.js';
import { PINNED, rankedCost } from './order-cost.js';
import { lengthOf } from './order-length.js';
import { framePaths } from './paths.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The weight of a piece of an edge through placeholders: crossing a long edge costs that much more. */
const DUMMY_WEIGHT = 8;

/** The links between nodes of neighbouring layers and within a layer, with their weights. */
export interface Neighbours {
  readonly adj: Map<string, string[]>;
  readonly weight: Map<string, number>;
}

const key = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** The pieces of every chain and every edge beside another, as neighbours with a weight per pair. */
export function neighboursOf(spec: LayeredSpec, ranked: Ranked): Neighbours {
  const adj = new Map<string, string[]>([...ranked.layerOf.keys()].map((n) => [n, []]));
  const weight = new Map<string, number>();
  const link = (a: string, b: string, w: number) => {
    if (!adj.get(a)?.includes(b)) adj.get(a)?.push(b);
    if (!adj.get(b)?.includes(a)) adj.get(b)?.push(a);
    weight.set(key(a, b), Math.max(weight.get(key(a, b)) ?? 0, w));
  };
  for (const e of spec.edges) {
    const chain = ranked.chains.get(e.id);
    const w = e.weight ?? 1;
    if (chain === undefined) continue;
    for (let i = 0; i + 1 < chain.length; i++) {
      const a = chain[i] as string;
      const b = chain[i + 1] as string;
      link(a, b, ranked.dummies.has(a) || ranked.dummies.has(b) ? Math.max(w, DUMMY_WEIGHT) : w);
    }
  }
  for (const e of ranked.beside) link(e.from, e.to, e.weight ?? 1);
  return { adj, weight };
}

/**
 * The order of every layer, placeholders included: the barycentre sweeps and the thorough search of `layers`, with
 * a cost that weighs each crossing by the weights of both pieces, keeps nodes beside each other near, counts a long
 * edge passing between them as the crossing it is, and counts
 * every foreign node standing between two members of one cluster, so clusters stay together where that is cheap.
 * A node in `pins` keeps to the left or right end of its layer, and nodes in `given` keep the order of their places
 * there, so only the placeholders find their places among them. Frames are hard clusters: the nodes of a frame stand
 * together in every layer and sibling frames in one order through the layers they share (`clustered`).
 */
export function orderRanked(
  spec: LayeredSpec,
  ranked: Ranked,
  links: Neighbours,
  pins: ReadonlyMap<string, 'left' | 'right'> = new Map(),
  given: ReadonlyMap<string, number> = new Map(),
): string[][] {
  const cluster = new Map(spec.nodes.flatMap((n) => (n.cluster === undefined ? [] : [[n.id, n.cluster] as const])));
  const cost = rankedCost({ ranked, links, cluster, pins, given, dummyWeight: DUMMY_WEIGHT });
  const nodes = [...spec.nodes.map((n) => n.id), ...ranked.dummies];
  const widths = new Map(spec.nodes.map((n) => [n.id, n.width] as const));
  const lengths = {
    links,
    layerOf: ranked.layerOf,
    width: (n: string) => widths.get(n) ?? 0,
    gap: spec.metrics.colGap,
    counts: () => 1,
  };
  const length = (layers: string[][]) => lengthOf(layers, lengths);
  if ((spec.frames ?? []).length === 0) {
    const plain = orderLayers(nodes, ranked.layerOf, links.adj, true, cost);
    const aside = chainsAside(plain, ranked, undefined, (layers) => cost(layers, links.adj, ranked.layerOf), length);
    return aside === plain ? plain : refine(aside, links.adj, ranked.layerOf, cost);
  }
  const fp = framePaths(spec, ranked);
  const broken = (layers: string[][]) => PINNED * framesBroken(layers, fp);
  const near = cost.near as NonNullable<OrderCost['near']>;
  const hard: OrderCost = Object.assign(
    (layers: string[][]) => cost(layers, links.adj, ranked.layerOf) + broken(layers),
    {
      near: (layers: string[][], l: number) => near(layers, l) + broken(layers),
    },
  );
  const first = orderLayers(nodes, ranked.layerOf, links.adj, true, hard);
  const together = clustered(first, fp, (layers) => hard(layers, links.adj, ranked.layerOf));
  const refined = refine(together, links.adj, ranked.layerOf, hard);
  const aside = chainsAside(refined, ranked, fp, (layers) => hard(layers, links.adj, ranked.layerOf), length);
  return aside === refined ? refined : refine(aside, links.adj, ranked.layerOf, hard);
}
