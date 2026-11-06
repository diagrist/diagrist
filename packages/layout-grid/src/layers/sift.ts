/** Layers of node ids, top first. */
export type Layers = string[][];
/** Neighbours per node. */
export type Adjacency = ReadonlyMap<string, readonly string[]>;

/**
 * What an order of the layers costs; lower is better. `layerCost` unless the caller brings its own. A cost may say
 * what of it a single layer's order decides (`near`): for two orders that differ only in layer `l`, `near(·, l)`
 * differs by as much as the whole cost, so a search that moves nodes within one layer prices only that.
 */
export type OrderCost = ((layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>) => number) & {
  readonly near?: (layers: Layers, l: number) => number;
  /**
   * What `n` costs at every place of its layer `l`, the others keeping their order: entry `i` for `n` at index `i`,
   * each differing from the others by as much as the whole cost would.
   */
  readonly places?: (layers: Layers, l: number, n: string) => readonly number[];
  /** How much the cost changes when the nodes at `i` and `i + 1` of layer `l` swap. */
  readonly swap?: (layers: Layers, l: number, i: number) => number;
};

/** The part of `cost` that the order of layer `l` decides, or the whole cost where it says nothing narrower. */
const nearOf =
  (cost: OrderCost, adj: Adjacency, layerOf: ReadonlyMap<string, number>) =>
  (layers: Layers, l: number): number =>
    cost.near === undefined ? cost(layers, adj, layerOf) : cost.near(layers, l);

/**
 * How much less an order must cost to count as cheaper: costs that sum lengths in pixels round differently when
 * summed in another order, and a search must not move for that.
 */
const SLACK = 1e-6;

/** Swaps neighbours as long as that lowers the cost, priced by the part of it their layer decides. */
export function polish(layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>, cost: OrderCost): Layers {
  const near = nearOf(cost, adj, layerOf);
  for (let improved = true; improved; ) {
    improved = false;
    layers.forEach((layer, l) => {
      for (let i = 0; i + 1 < layer.length; i++) {
        if (cost.swap !== undefined) {
          if (cost.swap(layers, l, i) >= -SLACK) continue;
          swap(layer, i);
          improved = true;
          continue;
        }
        const current = near(layers, l);
        swap(layer, i);
        if (near(layers, l) < current) improved = true;
        else swap(layer, i);
      }
    });
  }
  return layers;
}

function swap(layer: string[], i: number): void {
  const a = layer[i] as string;
  layer[i] = layer[i + 1] as string;
  layer[i + 1] = a;
}

/** What `n` costs at every place of layer `l`, by `places` where the cost has it, else trying each place. */
function placesOf(cost: OrderCost, near: (layers: Layers, l: number) => number) {
  return (layers: Layers, l: number, n: string): readonly number[] => {
    if (cost.places !== undefined) return cost.places(layers, l, n);
    const layer = layers[l] ?? [];
    const from = layer.indexOf(n);
    layer.splice(from, 1);
    const all = Array.from({ length: layer.length + 1 }, (_, to) => {
      layer.splice(to, 0, n);
      const c = near(layers, l);
      layer.splice(to, 1);
      return c;
    });
    layer.splice(from, 0, n);
    return all;
  };
}

/**
 * Moves each node to the place in its layer where the cost is lowest, as long as that lowers it, priced by the part
 * of the cost its place decides.
 */
export function sift(layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>, cost: OrderCost): Layers {
  const priced = placesOf(cost, nearOf(cost, adj, layerOf));
  for (let improved = true; improved; ) {
    improved = false;
    layers.forEach((layer, l) => {
      for (const n of [...layer]) {
        const from = layer.indexOf(n);
        const costs = priced(layers, l, n);
        let best = from;
        let lowest = Number.POSITIVE_INFINITY;
        costs.forEach((c, to) => {
          if (c < lowest - SLACK || (Math.abs(c - lowest) <= SLACK && to === from)) [lowest, best] = [c, to];
        });
        layer.splice(from, 1);
        layer.splice(best, 0, n);
        if (lowest < (costs[from] ?? lowest) - SLACK) improved = true;
      }
    });
  }
  return layers;
}
