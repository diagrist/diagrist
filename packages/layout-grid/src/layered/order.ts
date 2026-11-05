import { orderLayers } from '../layers/order.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The weight of a piece of an edge through placeholders: crossing a long edge costs that much more. */
const DUMMY_WEIGHT = 8;
/** What one foreign node between two members of a cluster costs, against 10 for a crossing. */
const CLUSTER_SPREAD = 3;
/** What a node kept to the outside of its layer costs for every other node beyond it: more than any crossing. */
const PINNED = 10_000;

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

/** The crossings among the pieces between two layers, each piece as its two places and its weight, weighted. */
function crossed(pairs: readonly (readonly [number, number, number])[]): number {
  let total = 0;
  for (let i = 0; i < pairs.length; i++) {
    const [p0, p1, pw] = pairs[i] as readonly [number, number, number];
    for (let j = i + 1; j < pairs.length; j++) {
      const [q0, q1, qw] = pairs[j] as readonly [number, number, number];
      if ((p0 - q0) * (p1 - q1) < 0) total += pw * qw;
    }
  }
  return total;
}

/** Nodes of a layer standing beyond one kept to the outside, or before one whose given place is earlier. */
function misplaced(
  layer: readonly string[],
  pins: ReadonlyMap<string, 'left' | 'right'>,
  given: ReadonlyMap<string, number>,
): number {
  let total = 0;
  layer.forEach((n, i) => {
    const pin = pins.get(n);
    const wrong = pin === 'left' ? layer.slice(0, i) : pin === 'right' ? layer.slice(i + 1) : [];
    total += wrong.filter((m) => pins.get(m) !== pin).length;
    const place = given.get(n);
    if (place !== undefined) total += layer.slice(i + 1).filter((m) => (given.get(m) ?? place) < place).length;
  });
  return total;
}

/** Foreign nodes standing between the first and the last member of a cluster in a layer, over all clusters. */
function spread(layer: readonly string[], cluster: ReadonlyMap<string, string>): number {
  const ends = new Map<string, [number, number, number]>();
  for (let i = 0; i < layer.length; i++) {
    const c = cluster.get(layer[i] as string);
    if (c === undefined) continue;
    const e = ends.get(c);
    if (e === undefined) ends.set(c, [i, i, 1]);
    else [e[1], e[2]] = [i, e[2] + 1];
  }
  let total = 0;
  for (const [first, last, members] of ends.values()) total += last - first + 1 - members;
  return total;
}

/** The neighbours of each node in the next layer with the weight of the piece, and those in its own layer. */
interface Reach {
  readonly down: ReadonlyMap<string, readonly (readonly [string, number])[]>;
  readonly beside: ReadonlyMap<string, readonly string[]>;
}

/**
 * The neighbours an order is priced by, read once per search: the layers of the nodes do not change while their
 * order does, so the cost of an order only looks up places.
 */
function reachOf(
  adj: ReadonlyMap<string, readonly string[]>,
  layerOf: ReadonlyMap<string, number>,
  w: (a: string, b: string) => number,
  cache: WeakMap<object, Reach>,
): Reach {
  const down = new Map<string, (readonly [string, number])[]>();
  const beside = new Map<string, string[]>();
  for (const [a, all] of adj) {
    const l = layerOf.get(a);
    down.set(
      a,
      all.filter((b) => l !== undefined && layerOf.get(b) === l + 1).map((b) => [b, w(a, b)] as const),
    );
    beside.set(
      a,
      all.filter((b) => l !== undefined && layerOf.get(b) === l),
    );
  }
  const reach = { down, beside };
  cache.set(adj, reach);
  return reach;
}

/**
 * The order of every layer, placeholders included: the barycentre sweeps and the thorough search of `layers`, with
 * a cost that weighs each crossing by the weights of both pieces, keeps nodes beside each other near, and counts
 * every foreign node standing between two members of one cluster, so clusters stay together where that is cheap.
 * A node in `pins` keeps to the left or right end of its layer, and nodes in `given` keep the order of their places
 * there, so only the placeholders find their places among them.
 */
export function orderRanked(
  spec: LayeredSpec,
  ranked: Ranked,
  links: Neighbours,
  pins: ReadonlyMap<string, 'left' | 'right'> = new Map(),
  given: ReadonlyMap<string, number> = new Map(),
): string[][] {
  const cluster = new Map(spec.nodes.flatMap((n) => (n.cluster === undefined ? [] : [[n.id, n.cluster] as const])));
  const w = (a: string, b: string) => links.weight.get(key(a, b)) ?? 1;
  const kept = pins.size > 0 || given.size > 0;
  const reach = new WeakMap<object, Reach>();
  const cost = (
    layers: string[][],
    adj: ReadonlyMap<string, readonly string[]>,
    layerOf: ReadonlyMap<string, number>,
  ) => {
    const { down, beside } = reach.get(adj) ?? reachOf(adj, layerOf, w, reach);
    const pos = new Map<string, number>();
    for (const layer of layers) for (let i = 0; i < layer.length; i++) pos.set(layer[i] as string, i);
    const at = (n: string) => pos.get(n) ?? 0;
    let total = 0;
    for (const layer of layers) {
      const pieces: (readonly [number, number, number])[] = [];
      for (const a of layer) for (const [b, wb] of down.get(a) ?? []) pieces.push([at(a), at(b), wb]);
      total += 10 * crossed(pieces);
      for (const a of layer) for (const b of beside.get(a) ?? []) total += Math.abs(at(a) - at(b)) - 1;
      if (kept) total += PINNED * misplaced(layer, pins, given);
      if (cluster.size > 0) total += CLUSTER_SPREAD * spread(layer, cluster);
    }
    return total;
  };
  const nodes = [...spec.nodes.map((n) => n.id), ...ranked.dummies];
  return orderLayers(nodes, ranked.layerOf, links.adj, true, cost);
}
