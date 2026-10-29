type Layers = string[][];
type Adjacency = ReadonlyMap<string, readonly string[]>;

const SWEEPS = 8;

function dfsOrder(nodes: readonly string[], adj: Adjacency): Map<string, number> {
  const seen = new Map<string, number>();
  const visit = (n: string): void => {
    seen.set(n, seen.size);
    for (const m of adj.get(n) ?? []) if (!seen.has(m)) visit(m);
  };
  for (const n of nodes) if (!seen.has(n)) visit(n);
  return seen;
}

const indexIn = (layers: Layers): Map<string, number> =>
  new Map(layers.flatMap((layer) => layer.map((n, i) => [n, i] as const)));

const at = (pos: ReadonlyMap<string, number>, n: string): number => pos.get(n) ?? 0;

/** Crossings between neighbouring layers, plus the distance of neighbours within one layer. */
export function layerCost(layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>): number {
  const pos = indexIn(layers);
  let total = 0;
  for (const [l, layer] of layers.entries()) {
    const pairs = layer.flatMap((a) =>
      (adj.get(a) ?? []).filter((b) => layerOf.get(b) === l + 1).map((b) => [at(pos, a), at(pos, b)] as const),
    );
    for (const [i, p] of pairs.entries())
      for (const q of pairs.slice(i + 1)) if ((p[0] - q[0]) * (p[1] - q[1]) < 0) total += 10;
    for (const a of layer)
      for (const b of adj.get(a) ?? []) if (layerOf.get(b) === l) total += Math.abs(at(pos, a) - at(pos, b)) - 1;
  }
  return total;
}

function sweep(layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>, down: boolean): void {
  const indices = down ? layers.map((_, i) => i) : layers.map((_, i) => layers.length - 1 - i);
  for (const l of indices.slice(1)) {
    const ref = down ? l - 1 : l + 1;
    const pos = indexIn(layers);
    const key = (n: string): number => {
      const across = (adj.get(n) ?? []).filter((m) => layerOf.get(m) === ref).map((m) => at(pos, m));
      const beside = (adj.get(n) ?? []).filter((m) => layerOf.get(m) === l).map((m) => at(pos, m));
      const use = across.length ? across : beside;
      return use.length ? use.reduce((a, b) => a + b, 0) / use.length : at(pos, n);
    };
    const keyed = (layers[l] ?? []).map((n, i) => ({ n, k: key(n), i }));
    layers[l] = keyed.sort((a, b) => a.k - b.k || a.i - b.i).map((x) => x.n);
  }
}

/** Swaps neighbours as long as that lowers the cost. */
function polish(layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>): Layers {
  let current = layerCost(layers, adj, layerOf);
  for (let improved = true; improved; ) {
    improved = false;
    for (const layer of layers)
      for (let i = 0; i + 1 < layer.length; i++) {
        swap(layer, i);
        const next = layerCost(layers, adj, layerOf);
        if (next < current) {
          current = next;
          improved = true;
        } else swap(layer, i);
      }
  }
  return layers;
}

function swap(layer: string[], i: number): void {
  const a = layer[i] as string;
  layer[i] = layer[i + 1] as string;
  layer[i + 1] = a;
}

/** Moves each node to the place in its layer where the cost is lowest, as long as that lowers it. */
function sift(layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>): Layers {
  let current = layerCost(layers, adj, layerOf);
  for (let improved = true; improved; ) {
    improved = false;
    for (const layer of layers)
      for (const n of [...layer]) {
        const from = layer.indexOf(n);
        layer.splice(from, 1);
        let best = from;
        let cost = Number.POSITIVE_INFINITY;
        for (let to = 0; to <= layer.length; to++) {
          layer.splice(to, 0, n);
          const c = layerCost(layers, adj, layerOf);
          if (c < cost || (c === cost && to === from)) {
            cost = c;
            best = to;
          }
          layer.splice(to, 1);
        }
        layer.splice(best, 0, n);
        if (cost < current) {
          current = cost;
          improved = true;
        }
      }
  }
  return layers;
}

/** The layers filled in the order of `nodes`. */
function filled(nodes: readonly string[], layerOf: ReadonlyMap<string, number>): Layers {
  const count = Math.max(0, ...layerOf.values()) + 1;
  const layers: Layers = Array.from({ length: count }, () => []);
  for (const n of nodes) layers[layerOf.get(n) ?? 0]?.push(n);
  return layers;
}

/**
 * Order within the layers: start in depth-first order, so what is connected stands together, then barycentre sweeps
 * down and up. The order with the fewest crossings stays; neighbours in one layer should stand side by side.
 * `thorough` also starts with each layer turned around in turn, sweeping first up and first down, and then moves
 * every node to its best place in its layer. That finds orders the swapping of neighbours cannot reach, where two
 * layers have to change together; the cheapest result wins, the first on a tie.
 */
export function orderLayers(
  nodes: readonly string[],
  layerOf: ReadonlyMap<string, number>,
  adj: Adjacency,
  thorough = false,
): Layers {
  const start = dfsOrder(nodes, adj);
  const base = filled(
    [...nodes].sort((a, b) => at(start, a) - at(start, b)),
    layerOf,
  );
  if (!thorough) return improve(base, adj, layerOf, true);
  const turned = base.flatMap((layer, l) =>
    layer.length < 2 ? [] : [base.map((other, k) => (k === l ? [...other].reverse() : [...other]))],
  );
  const runs = [base, ...turned].flatMap((layers) =>
    [true, false].map((down) =>
      sift(
        improve(
          layers.map((l) => [...l]),
          adj,
          layerOf,
          down,
        ),
        adj,
        layerOf,
      ),
    ),
  );
  const costs = runs.map((r) => layerCost(r, adj, layerOf));
  return runs[costs.indexOf(Math.min(...costs))] ?? base;
}

function improve(layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>, down: boolean): Layers {
  let best = layers.map((l) => [...l]);
  let bestCost = layerCost(best, adj, layerOf);
  for (let i = 0; i < SWEEPS; i++) {
    sweep(layers, adj, layerOf, i % 2 === (down ? 0 : 1));
    const c = layerCost(layers, adj, layerOf);
    if (c < bestCost) {
      best = layers.map((l) => [...l]);
      bestCost = c;
    }
  }
  return polish(best, adj, layerOf);
}
