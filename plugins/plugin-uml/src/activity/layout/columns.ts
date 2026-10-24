import { type LayerEdge, neighbours, positions } from '@diagrist/layout-grid';
import type { ActivityRanks } from './rank.js';

/** Horizontal place in a lane: centre per node from the left edge of the content, and its width. */
export interface LaneColumns {
  readonly center: ReadonlyMap<string, number>;
  readonly width: number;
}

/** Edges as chains over their waypoints; back edges and horizontal hand-overs do not count for the order. */
export function chainEdges(ranks: ActivityRanks): LayerEdge[] {
  return ranks.flows.flatMap((f) => {
    if (f.back || f.side) return [];
    const chain = [f.from, ...f.dummies, f.to];
    return chain.slice(1).map((to, i): LayerEdge => ({ from: chain[i] ?? to, to, rank: 1 }));
  });
}

const byCodePoint = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Half columns to pixels: a node at half position h takes the slots h and h+1. Every slot grows until the nodes on
 * it fit with their gap; a diamond centred over two branches so stands exactly between them.
 */
function slots(half: ReadonlyMap<string, number>, need: (id: string) => number): number[] {
  const count = Math.max(-1, ...half.values()) + 2;
  const w = Array.from({ length: count }, () => 0);
  const byNeed = [...half.keys()].sort((a, b) => need(b) - need(a) || byCodePoint(a, b));
  for (const id of byNeed) {
    const h = half.get(id) ?? 0;
    const missing = need(id) - ((w[h] ?? 0) + (w[h + 1] ?? 0));
    if (missing > 0) {
      w[h] = (w[h] ?? 0) + missing / 2;
      w[h + 1] = (w[h + 1] ?? 0) + missing / 2;
    }
  }
  return w;
}

/** Reach left and right of the centre; without it, half the `span` on both sides. */
export type Extent = (id: string, center: ReadonlyMap<string, number>) => { left: number; right: number } | undefined;

/**
 * Pulls the edges of the lane in where a node carries text on one side only: the slots reserve symmetrically, at
 * the edge only what really stands there counts.
 */
function trim(
  nodes: readonly string[],
  center: Map<string, number>,
  width: number,
  half: (id: string) => number,
  extent: Extent,
): LaneColumns {
  if (nodes.length === 0) return { center, width };
  const ext = (id: string) => extent(id, center) ?? { left: half(id), right: half(id) };
  const at = (id: string) => center.get(id) ?? 0;
  const left =
    Math.min(...nodes.map((id) => at(id) - ext(id).left)) - Math.min(...nodes.map((id) => at(id) - half(id)));
  const right =
    Math.max(...nodes.map((id) => at(id) + half(id))) - Math.max(...nodes.map((id) => at(id) + ext(id).right));
  if (left <= 0 && right <= 0) return { center, width };
  const moved = new Map([...center].map(([id, x]) => [id, x - Math.max(0, left)]));
  return { center: moved, width: width - Math.max(0, left) - Math.max(0, right) };
}

/**
 * Own places per lane with the layering's column solver, in the order of `laneOrder`: near the mean of the
 * neighbours. A fork so stands centred over its branches, a diamond between its alternatives. Edges into other lanes
 * pull only the order; the place stays per lane.
 */
export function laneColumns(
  ranks: ActivityRanks,
  order: readonly (readonly string[])[],
  lane: number,
  span: (id: string) => number,
  gap: number,
  extent: Extent = () => undefined,
): LaneColumns {
  const nodes = ranks.ids.filter((id) => ranks.laneOf.get(id) === lane);
  const inLane = new Set(nodes);
  const edges = chainEdges(ranks).filter((e) => inLane.has(e.from) && inLane.has(e.to));
  const adj = neighbours({ nodes, edges });
  const layerOf = new Map(nodes.map((id) => [id, ranks.layerOf.get(id) ?? 0]));
  const layers = order.map((layer) => layer.filter((id) => inLane.has(id)));
  const pos = positions(layers, adj, layerOf);
  const half = new Map([...pos].map(([id, p]) => [id, Math.round(p * 2)]));
  const w = slots(half, (id) => span(id) + gap);
  const start = w.map((_, i) => w.slice(0, i).reduce((s, x) => s + x, 0));
  const center = new Map(
    [...half].map(([id, h]) => [id, (start[h] ?? 0) + ((w[h] ?? 0) + (w[h + 1] ?? 0)) / 2 - gap / 2]),
  );
  return trim(nodes, center, Math.max(0, w.reduce((s, x) => s + x, 0) - gap), (id) => span(id) / 2, extent);
}
