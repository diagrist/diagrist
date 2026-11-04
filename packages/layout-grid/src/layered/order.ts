import { orderLayers } from '../layers/order.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** The weight of a piece of an edge through placeholders: crossing a long edge costs that much more. */
const DUMMY_WEIGHT = 8;
/** What one foreign node between two members of a cluster costs, against 10 for a crossing. */
const CLUSTER_SPREAD = 3;

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
 * a cost that weighs each crossing by the weights of both pieces, keeps nodes beside each other near, and counts
 * every foreign node standing between two members of one cluster, so clusters stay together where that is cheap.
 */
export function orderRanked(spec: LayeredSpec, ranked: Ranked, links: Neighbours): string[][] {
  const cluster = new Map(spec.nodes.flatMap((n) => (n.cluster === undefined ? [] : [[n.id, n.cluster] as const])));
  const w = (a: string, b: string) => links.weight.get(key(a, b)) ?? 1;
  const cost = (
    layers: string[][],
    adj: ReadonlyMap<string, readonly string[]>,
    layerOf: ReadonlyMap<string, number>,
  ) => {
    const pos = new Map(layers.flatMap((layer) => layer.map((n, i) => [n, i] as const)));
    const at = (n: string) => pos.get(n) ?? 0;
    let total = 0;
    for (const [l, layer] of layers.entries()) {
      const pairs = layer.flatMap((a) =>
        (adj.get(a) ?? []).filter((b) => layerOf.get(b) === l + 1).map((b) => [at(a), at(b), w(a, b)] as const),
      );
      for (const [i, p] of pairs.entries())
        for (const q of pairs.slice(i + 1)) if ((p[0] - q[0]) * (p[1] - q[1]) < 0) total += 10 * p[2] * q[2];
      for (const a of layer)
        for (const b of adj.get(a) ?? []) if (layerOf.get(b) === l) total += Math.abs(at(a) - at(b)) - 1;
      for (const c of new Set(layer.flatMap((n) => cluster.get(n) ?? []))) {
        const mine = layer.flatMap((n, i) => (cluster.get(n) === c ? [i] : []));
        const span = (mine.at(-1) ?? 0) - (mine[0] ?? 0) + 1;
        total += CLUSTER_SPREAD * (span - mine.length);
      }
    }
    return total;
  };
  const nodes = [...spec.nodes.map((n) => n.id), ...ranked.dummies];
  return orderLayers(nodes, ranked.layerOf, links.adj, true, cost);
}
