import { orderLayers, refine } from '../layers/order.js';
import type { OrderCost } from '../layers/sift.js';
import { orderStarts } from './budget.js';
import { chainsAside } from './chains.js';
import { clustered, framesBroken } from './clusters.js';
import { lanesOf } from './lanes.js';
import { PINNED, rankedCost } from './order-cost.js';
import { firstBroken, firstPairs } from './order-first.js';
import { lengthOf } from './order-length.js';
import { spanPricing } from './order-span.js';
import { inversions } from './order-terms.js';
import { trunkSites } from './order-trunks.js';
import { framePaths } from './paths.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The weight of a piece of an edge through placeholders: crossing a long edge costs that much more. */
const DUMMY_WEIGHT = 8;

/**
 * What a pixel of the estimated length across of the pieces costs in the order, against 10 for a crossing of two
 * pieces of weight 1: a crossing is worth 600 pixels of detour (`DETOUR`, owner decision of 06.11.2026).
 */
const PER_PIXEL = 10 / 600;

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
 * together in every layer and sibling frames in one order through the layers they share (`clustered`). A trunk
 * crossed by a piece of its own box counts as the crossings it makes (`trunkSites`). A big picture tries fewer
 * starting orders (`orderStarts`).
 */
export function orderRanked(
  spec: LayeredSpec,
  ranked: Ranked,
  links: Neighbours,
  pins: ReadonlyMap<string, 'left' | 'right'> = new Map(),
  given: ReadonlyMap<string, number> = new Map(),
): string[][] {
  const { cost, length } = costsOf(spec, ranked, links, pins, given);
  const nodes = [...spec.nodes.map((n) => n.id), ...ranked.dummies];
  const fp = (spec.frames ?? []).length === 0 ? undefined : framePaths(spec, ranked);
  const priced = (layers: string[][]) => cost(layers, links.adj, ranked.layerOf);
  const first = orderLayers(nodes, ranked.layerOf, links.adj, true, cost, orderStarts(ranked.layerOf));
  const refined =
    fp === undefined
      ? firstPairs(spec).length === 0
        ? first
        : refine(first, links.adj, ranked.layerOf, cost)
      : refine(clustered(first, fp, priced), links.adj, ranked.layerOf, cost);
  const aside = chainsAside(refined, ranked, fp, priced, length);
  return aside === refined ? refined : refine(aside, links.adj, ranked.layerOf, cost);
}

/**
 * The order `layers` made shorter: moved node by node while the estimated length across of the pieces saves more
 * than the crossings it adds, a crossing worth `600` pixels (`PER_PIXEL`). Undefined where nothing moves; the caller
 * lays out both and keeps the one whose drawing trades as the rule says (`laidOut`).
 */
export function shortened(
  spec: LayeredSpec,
  ranked: Ranked,
  links: Neighbours,
  layers: readonly (readonly string[])[],
  pins: ReadonlyMap<string, 'left' | 'right'> = new Map(),
  given: ReadonlyMap<string, number> = new Map(),
): string[][] | undefined {
  const { long } = costsOf(spec, ranked, links, pins, given);
  const moved = refine(
    layers.map((l) => [...l]),
    links.adj,
    ranked.layerOf,
    long,
  );
  return moved.every((l, i) => l.every((n, k) => layers[i]?.[k] === n)) ? undefined : moved;
}

/** Pairs of nodes, in any layer, whose lanes stand in the wrong order. */
const lanesBroken = (layers: readonly string[][], lane: ReadonlyMap<string, number>): number =>
  layers.reduce((n, layer) => n + inversions(layer, lane), 0);

/**
 * The cost of an order by crossings and the rest, the same with its length (`long`), and the estimated length; a
 * frame broken, a lane out of its order or a pair of an edge beside out of the order it asks costs `PINNED`.
 */
function costsOf(
  spec: LayeredSpec,
  ranked: Ranked,
  links: Neighbours,
  pins: ReadonlyMap<string, 'left' | 'right'>,
  given: ReadonlyMap<string, number>,
) {
  const cluster = new Map(spec.nodes.flatMap((n) => (n.cluster === undefined ? [] : [[n.id, n.cluster] as const])));
  const widths = new Map(spec.nodes.map((n) => [n.id, n.width] as const));
  const width = (n: string) => widths.get(n) ?? 0;
  const weight = (a: string, b: string) => links.weight.get(key(a, b)) ?? 1;
  const gap = spec.metrics.colGap;
  const pricing = spanPricing({ adj: links.adj, layerOf: ranked.layerOf, width, gap, weight });
  const trunks = trunkSites(spec, ranked, weight);
  const base = { ranked, links, cluster, pins, given, dummyWeight: DUMMY_WEIGHT, trunks };
  const fp = (spec.frames ?? []).length === 0 ? undefined : framePaths(spec, ranked);
  const lanes = lanesOf(spec, ranked);
  const lane = new Map([...ranked.layerOf.keys()].map((n) => [n, lanes.of(n) ?? -1] as const));
  const laned = (spec.lanes ?? []).length > 0;
  const firsts = firstPairs(spec);
  const framed = (c: OrderCost): OrderCost => {
    if (fp === undefined && !laned && firsts.length === 0) return c;
    const near = c.near as NonNullable<OrderCost['near']>;
    const out = (layers: string[][]) =>
      (fp ? framesBroken(layers, fp) : 0) + (laned ? lanesBroken(layers, lane) : 0) + firstBroken(layers, firsts);
    const broken = (layers: string[][]) => PINNED * out(layers);
    return Object.assign((layers: string[][]) => c(layers, links.adj, ranked.layerOf) + broken(layers), {
      near: (layers: string[][], l: number) => near(layers, l) + broken(layers),
    });
  };
  const lengths = { links, layerOf: ranked.layerOf, width, gap, counts: () => 1 };
  return {
    cost: framed(rankedCost(base)),
    long: framed(rankedCost({ ...base, span: { pricing, perPixel: PER_PIXEL } })),
    length: (layers: string[][]) => lengthOf(layers, lengths),
  };
}
