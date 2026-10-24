import { type LayerEdge, type Layered, neighbours, positions } from '@diagrist/layout-grid';

type Layers = readonly (readonly string[])[];

/** Rounds of improvement before the search stops even if it still finds better arrangements. */
const ROUNDS = 40;

/** Edges with a rank keep their direction: the source stays in a layer above the target. */
const keepsRanks = (layers: Layers, edges: readonly LayerEdge[]) => {
  const layerOf = new Map(layers.flatMap((layer, l) => layer.map((n) => [n, l] as const)));
  return edges.every((e) => e.rank === 0 || (layerOf.get(e.from) ?? 0) < (layerOf.get(e.to) ?? 0));
};

const without = (layers: Layers, n: string) => layers.map((layer) => layer.filter((m) => m !== n));

const swapped = (layer: readonly string[], i: number, j: number) =>
  layer.map((n, at) => (at === i ? (layer[j] ?? n) : at === j ? (layer[i] ?? n) : n));

/** Neighbours of an arrangement: two blocks of a layer swap, a block moves into another layer or a new one. */
function* variants(layers: Layers, perLayer: number): Generator<string[][]> {
  for (const [l, layer] of layers.entries())
    for (let i = 0; i < layer.length; i++)
      for (let j = i + 1; j < layer.length; j++) yield layers.map((x, k) => (k === l ? swapped(x, i, j) : [...x]));
  for (const [l, layer] of layers.entries())
    for (const n of layer)
      for (const [k, target] of layers.entries()) {
        if (k === l || target.length >= perLayer) continue;
        for (let at = 0; at <= target.length; at++) {
          const next = without(layers, n);
          next[k]?.splice(at, 0, n);
          yield next.filter((x) => x.length);
        }
      }
  for (const n of layers.flat())
    for (let k = 0; k <= layers.length; k++) {
      const next = without(layers, n);
      next.splice(k, 0, [n]);
      yield next.filter((x) => x.length);
    }
}

/**
 * Searches arrangements of the blocks of one level by steepest improvement: from the best so far, every swap and move
 * that keeps the ranks is tried and scored by `cost`, until no neighbour is cheaper. Returns the `keep` cheapest
 * arrangements seen, cheapest first and the earlier one on a tie; `start` is always among them, last if it did not
 * make the cut, because only a real layout can tell whether the estimate was right.
 */
export function arrangements(
  start: Layered,
  edges: readonly LayerEdge[],
  perLayer: number,
  cost: (a: Layered) => number,
  keep: number,
): Layered[] {
  const adj = neighbours({ nodes: start.layers.flat(), edges });
  const seen = new Map<string, { readonly a: Layered; readonly cost: number }>();
  let best = { a: start, cost: cost(start) };
  seen.set(JSON.stringify(start.layers), best);
  for (let round = 0, improved = true; improved && round < ROUNDS; round++) {
    improved = false;
    for (const layers of variants(best.a.layers, perLayer)) {
      const key = JSON.stringify(layers);
      if (seen.has(key) || !keepsRanks(layers, edges)) continue;
      const layerOf = new Map(layers.flatMap((layer, l) => layer.map((n) => [n, l] as const)));
      const a = { layers, position: positions(layers, adj, layerOf) };
      const tried = { a, cost: cost(a) };
      seen.set(key, tried);
      if (tried.cost < best.cost - 1e-9) {
        best = tried;
        improved = true;
      }
    }
  }
  const top = [...seen.values()]
    .sort((x, y) => x.cost - y.cost)
    .slice(0, keep)
    .map((x) => x.a);
  return top.includes(start) ? top : [...top.slice(0, keep - 1), start];
}
