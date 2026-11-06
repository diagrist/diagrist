import type { OrderCost } from '../layers/sift.js';
import type { Neighbours } from './order.js';
import { crossed, misplaced, spread } from './order-terms.js';
import type { Ranked } from './rank.js';

/** What one foreign node between two members of a cluster costs, against 10 for a crossing. */
const CLUSTER_SPREAD = 3;
/**
 * What a node kept to the outside of its layer costs for every other node beyond it, and what a foreign node inside a
 * frame costs: more than any crossing.
 */
export const PINNED = 10_000;

const key = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** The neighbours of each node in the next layer with the weight of the piece, and those in its own layer. */
interface Reach {
  readonly down: ReadonlyMap<string, readonly (readonly [string, number])[]>;
  readonly beside: ReadonlyMap<string, readonly string[]>;
}

/**
 * The neighbours an order is priced by, read once per search: the layers of the nodes do not change while their
 * order does, so the cost of an order only looks up places.
 */
function reachOf(links: Neighbours, layerOf: ReadonlyMap<string, number>): Reach {
  const down = new Map<string, (readonly [string, number])[]>();
  const beside = new Map<string, string[]>();
  for (const [a, all] of links.adj) {
    const l = layerOf.get(a);
    down.set(
      a,
      all
        .filter((b) => l !== undefined && layerOf.get(b) === l + 1)
        .map((b) => [b, links.weight.get(key(a, b)) ?? 1] as const),
    );
    beside.set(
      a,
      all.filter((b) => l !== undefined && layerOf.get(b) === l),
    );
  }
  return { down, beside };
}

/** What the order of the layers of a ranked picture weighs, besides frames. */
export interface RankedCost {
  readonly ranked: Ranked;
  readonly links: Neighbours;
  readonly cluster: ReadonlyMap<string, string>;
  readonly pins: ReadonlyMap<string, 'left' | 'right'>;
  readonly given: ReadonlyMap<string, number>;
  /** The weight of a piece through placeholders, by which a long edge passing between neighbours counts. */
  readonly dummyWeight: number;
}

/**
 * The cost of an order of a ranked picture: each crossing weighted by the weights of both pieces, nodes beside each
 * other apart and long edges passing between them, nodes off their pins or given places, clusters spread. It prices
 * a whole order, the part one layer decides (`near`), a node at every place of its layer (`places`) and the change
 * a swap of two neighbours makes (`swap`): for the last two, only crossings with the moving node's own pieces change,
 * counted once against every other node of the layer.
 */
export function rankedCost(c: RankedCost): OrderCost {
  const { ranked, cluster, pins, given } = c;
  const kept = pins.size > 0 || given.size > 0;
  const passing = (layer: readonly string[], from: number, to: number) => {
    let count = 0;
    for (let k = from; k < to; k++) count += ranked.dummies.has(layer[k] as string) ? 1 : 0;
    return count;
  };
  const { down, beside } = reachOf(c.links, ranked.layerOf);
  const up = new Map<string, (readonly [string, number])[]>();
  for (const [a, list] of down) for (const [b, w] of list) up.set(b, [...(up.get(b) ?? []), [a, w] as const]);
  const placesOf = (layer: readonly string[] | undefined, pos: Map<string, number>) =>
    layer?.forEach((n, i) => {
      pos.set(n, i);
    });
  /** The crossings between layer `l` and the next, weighted. */
  const across = (layers: readonly (readonly string[])[], l: number, at: (n: string) => number) => {
    const pieces: (readonly [number, number, number])[] = [];
    for (const a of layers[l] ?? []) for (const [b, wb] of down.get(a) ?? []) pieces.push([at(a), at(b), wb]);
    return 10 * crossed(pieces);
  };
  /** Neighbours apart, long edges between them, pins and given places broken and clusters spread in one layer. */
  const own = (layer: readonly string[], at: (n: string) => number) => {
    let total = 0;
    for (const a of layer)
      for (const b of beside.get(a) ?? []) {
        total += Math.abs(at(a) - at(b)) - 1;
        if (at(a) < at(b)) total += 10 * c.dummyWeight * passing(layer, at(a) + 1, at(b));
      }
    if (kept) total += PINNED * misplaced(layer, pins, given);
    if (cluster.size > 0) total += CLUSTER_SPREAD * spread(layer, cluster);
    return total;
  };
  const whole = (layers: string[][]) => {
    const pos = new Map<string, number>();
    for (const layer of layers) placesOf(layer, pos);
    const at = (n: string) => pos.get(n) ?? 0;
    return layers.reduce((sum, layer, l) => sum + across(layers, l, at) + own(layer, at), 0);
  };
  const near = (layers: string[][], l: number) => {
    const pos = new Map<string, number>();
    for (const k of [l - 1, l, l + 1]) placesOf(layers[k], pos);
    const at = (n: string) => pos.get(n) ?? 0;
    return across(layers, l - 1, at) + across(layers, l, at) + own(layers[l] ?? [], at);
  };
  /** Weighted crossings of the pieces of `n` with those of `v`, `v` standing left of `n`, and right of it. */
  const pairCost = (n: string, v: string, pos: ReadonlyMap<string, number>): [number, number] => {
    let [left, right] = [0, 0];
    for (const side of [down, up])
      for (const [b, wb] of side.get(n) ?? [])
        for (const [d, wd] of side.get(v) ?? []) {
          const [pb, pd] = [pos.get(b) ?? 0, pos.get(d) ?? 0];
          if (pd > pb) left += wb * wd;
          else if (pd < pb) right += wb * wd;
        }
    return [10 * left, 10 * right];
  };
  const places = (layers: string[][], l: number, n: string) => {
    const others = (layers[l] ?? []).filter((m) => m !== n);
    const pos = new Map<string, number>();
    for (const k of [l - 1, l + 1]) placesOf(layers[k], pos);
    const pairs = others.map((v) => pairCost(n, v, pos));
    const index = new Map(others.map((m, i) => [m, i]));
    const still = !kept && cluster.size === 0 && others.every((m) => (beside.get(m) ?? []).length === 0);
    let leftOf = 0;
    let rightOf = pairs.reduce((s, p) => s + p[1], 0);
    return Array.from({ length: others.length + 1 }, (_, to) => {
      if (to > 0) {
        const [l0, r0] = pairs[to - 1] as [number, number];
        [leftOf, rightOf] = [leftOf + l0, rightOf - r0];
      }
      if (still && (beside.get(n) ?? []).length === 0) return leftOf + rightOf;
      const layer = [...others.slice(0, to), n, ...others.slice(to)];
      const at = (m: string) => {
        if (m === n) return to;
        const i = index.get(m) ?? 0;
        return i < to ? i : i + 1;
      };
      return leftOf + rightOf + own(layer, at);
    });
  };
  const swap = (layers: string[][], l: number, i: number) => {
    const layer = layers[l] ?? [];
    const [n, v] = [layer[i] as string, layer[i + 1] as string];
    const pos = new Map<string, number>();
    for (const k of [l - 1, l + 1]) placesOf(layers[k], pos);
    const [left, right] = pairCost(n, v, pos);
    const still = !kept && cluster.size === 0 && layer.every((m) => (beside.get(m) ?? []).length === 0);
    if (still) return left - right;
    const at = (list: readonly string[]) => {
      const p = new Map(list.map((m, k) => [m, k]));
      return (m: string) => p.get(m) ?? 0;
    };
    const turned = [...layer.slice(0, i), v, n, ...layer.slice(i + 2)];
    return left - right + own(turned, at(turned)) - own(layer, at(layer));
  };
  return Object.assign((layers: string[][]) => whole(layers), { near, places, swap });
}
