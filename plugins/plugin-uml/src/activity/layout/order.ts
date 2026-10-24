import { type LayerEdge, layerCost, neighbours } from '@diagrist/layout-grid';
import type { ActivityRanks } from './rank.js';

const SWEEPS = 8;
/** Distance of two lanes in the sort: larger than any layer is wide. */
const LANE = 1000;

type Layers = string[][];

/**
 * Order per layer across all lanes: first by lane, within it by the mean of the neighbours in the neighbouring layer
 * (barycentre). Neighbours in other lanes count with their lane, so a node moves to the side where its edge leaves
 * the lane. The sweep with the fewest crossings stays. A handler action (`after`: handler to protected action)
 * stands right beside its action.
 */
export function laneOrder(
  ranks: ActivityRanks,
  edges: readonly LayerEdge[],
  after: ReadonlyMap<string, string> = new Map(),
): Layers {
  const lane = (id: string) => ranks.laneOf.get(id) ?? 0;
  const layerOf = ranks.layerOf;
  const adj = neighbours({ nodes: ranks.ids, edges });
  const layers: Layers = Array.from({ length: ranks.layers }, () => []);
  for (const id of ranks.ids) layers[layerOf.get(id) ?? 0]?.push(id);
  for (const layer of layers) layer.sort((a, b) => lane(a) - lane(b));

  const coord = (current: Layers) => {
    const out = new Map<string, number>();
    for (const layer of current) {
      const seen = new Map<number, number>();
      for (const id of layer) {
        const k = seen.get(lane(id)) ?? 0;
        out.set(id, lane(id) * LANE + k);
        seen.set(lane(id), k + 1);
      }
    }
    return out;
  };

  let best = layers.map((l) => [...l]);
  let bestCost = layerCost(best, adj, layerOf);
  for (let s = 0; s < SWEEPS; s++) {
    const down = s % 2 === 0;
    const order = layers.map((_, i) => (down ? i : layers.length - 1 - i)).slice(1);
    for (const l of order) {
      const pos = coord(layers);
      const at = (id: string) => pos.get(id) ?? 0;
      const ref = down ? l - 1 : l + 1;
      const key = (id: string) => {
        const across = (adj.get(id) ?? []).filter((m) => layerOf.get(m) === ref).map(at);
        return across.length ? across.reduce((a, b) => a + b, 0) / across.length : at(id);
      };
      const current = layers[l] ?? [];
      const keys = new Map(current.map((id) => [id, key(id)]));
      const keyed = current.map((id, i) => ({ id, i, k: keys.get(after.get(id) ?? '') ?? keys.get(id) ?? 0 }));
      for (const x of keyed) if (keys.has(after.get(x.id) ?? '')) x.k += 0.001;
      keyed.sort((a, b) => lane(a.id) - lane(b.id) || a.k - b.k || a.i - b.i);
      layers[l] = keyed.map((x) => x.id);
    }
    const c = layerCost(layers, adj, layerOf);
    if (c <= bestCost) {
      best = layers.map((l) => [...l]);
      bestCost = c;
    }
  }
  return best;
}
