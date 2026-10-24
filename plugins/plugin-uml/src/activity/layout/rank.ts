import { acyclic, assignLayers, type LayerEdge } from '@diagrist/layout-grid';
import { expansionEdges, expansionTies } from './expansion.js';
import { type Graph, type GraphFlow, isHandlerFlow } from './graph.js';
import { acceptMerges, conflicting, handoffCandidates, representatives } from './handoff.js';
import { triggerEdges } from './regions.js';

/** An edge with its rank: forward over layers (with waypoints) or backward as a loop. */
export interface RankedFlow {
  readonly index: number;
  readonly from: string;
  readonly to: string;
  /** A back edge (loop) or a self loop: it runs around the outside, not through the layers. */
  readonly back: boolean;
  /** A hand-over into another lane in the same layer: horizontal from side to side. */
  readonly side: boolean;
  /** One waypoint per layer skipped, from top to bottom. */
  readonly dummies: readonly string[];
  /** A handler bolt that cannot stand beside its protected action: it leaves at the bottom, offset to the side. */
  readonly handler?: true;
}

export interface ActivityRanks {
  /** Real nodes in source order, then the waypoints. */
  readonly ids: readonly string[];
  readonly dummy: ReadonlySet<string>;
  readonly layerOf: ReadonlyMap<string, number>;
  readonly laneOf: ReadonlyMap<string, number>;
  readonly flows: readonly RankedFlow[];
  readonly layers: number;
}

/** Nodes without input first: the depth-first search starts at starts and events, so loops become back edges. */
function startFirst(ids: readonly string[], g: Graph): string[] {
  const entered = new Set(g.flows.filter((f) => f.from !== f.to).map((f) => f.to));
  return [...ids.filter((id) => !entered.has(id)), ...ids.filter((id) => entered.has(id))];
}

/** Layers without gaps, from 0. */
function compact(layer: ReadonlyMap<string, number>): Map<string, number> {
  const used = [...new Set(layer.values())].sort((a, b) => a - b);
  return new Map([...layer].map(([n, l]) => [n, used.indexOf(l)]));
}

/**
 * Lane per node: its own from `in`, else that of its first predecessor with a lane, else that of its first
 * successor. Start, ends and bars without `in` so stand beside their neighbour.
 */
function lanes(g: Graph): Map<string, number> {
  const index = new Map(g.partitions.map((p, i) => [p.id, i]));
  const lane = new Map<string, number>();
  for (const n of g.nodes) {
    const own = n.lane === undefined ? undefined : index.get(n.lane);
    if (own !== undefined) lane.set(n.id, own);
  }
  const pick = (id: string, key: 'from' | 'to', other: 'from' | 'to') =>
    g.flows.filter((f) => f[key] === id && lane.has(f[other])).map((f) => lane.get(f[other]))[0];
  for (let changed = true; changed; ) {
    changed = false;
    for (const n of g.nodes) {
      if (lane.has(n.id)) continue;
      const found = pick(n.id, 'to', 'from') ?? pick(n.id, 'from', 'to');
      if (found === undefined) continue;
      lane.set(n.id, found);
      changed = true;
    }
  }
  for (const n of g.nodes) if (!lane.has(n.id)) lane.set(n.id, 0);
  return lane;
}

/** Layers with hand-overs: joined nodes count as one, then each gets the layer of its group. */
function layered(
  ids: readonly string[],
  g: Graph,
  edges: readonly LayerEdge[],
  merges: readonly GraphFlow[],
): Map<string, number> {
  const find = representatives(merges);
  const mapped = edges.map((e): LayerEdge => ({ from: find(e.from), to: find(e.to), rank: e.rank }));
  const ranked = acyclic([...new Set(startFirst(ids, g).map(find))], mapped);
  const layer = compact(assignLayers([...new Set(ids.map(find))], ranked, []));
  return new Map(ids.map((id) => [id, layer.get(find(id)) ?? 0]));
}

/**
 * Layers by the longest path over the forward edges, back edges from a depth-first search from the starts.
 * Hand-overs between lanes stay in one layer while their horizontal line is free; triggers of an interruptible
 * region stand beside its deepest member. Long edges get a waypoint per layer between, in the lane of their source,
 * so they cut past no node.
 */
export function rankActivity(g: Graph, extra: readonly LayerEdge[] = []): ActivityRanks {
  const ids = g.nodes.map((n) => n.id);
  const known = new Set(ids);
  const valid = g.flows.filter((f) => known.has(f.from) && known.has(f.to));
  const proper = valid.filter((f) => f.from !== f.to);
  const laneOf = lanes(g);
  const guarded = proper.filter(isHandlerFlow);
  const shared = new Set<GraphFlow>(guarded.filter((f, k) => guarded.findIndex((h) => h.to === f.to) < k));
  const base: LayerEdge[] = [
    ...proper.filter((f) => !shared.has(f)).map((f): LayerEdge => ({ from: f.from, to: f.to, rank: 1 })),
    ...expansionEdges(g),
    ...extra,
  ];
  let handlers: GraphFlow[] = guarded.filter((f) => !shared.has(f));
  const flowing = proper.filter((f) => !isHandlerFlow(f));
  let merges = acceptMerges(handoffCandidates(g, flowing, laneOf), laneOf);
  const ties = expansionTies(g);
  const all = () => [...handlers, ...merges, ...ties];
  const edges = [...base, ...triggerEdges(g, flowing, layered(ids, g, base, all()))];
  let layerOf = layered(ids, g, edges, all());
  const at = (id: string) => layerOf.get(id) ?? 0;
  for (;;) {
    const forward = flowing.filter((f) => at(f.from) < at(f.to));
    const bad = conflicting(merges, forward, ids, layerOf, laneOf);
    const blocked = bad ? undefined : conflicting(all(), forward, ids, layerOf, laneOf, handlers);
    if (!bad && !blocked) break;
    merges = merges.filter((m) => m !== bad);
    handlers = handlers.filter((h) => h !== blocked);
    layerOf = layered(ids, g, edges, all());
  }
  const side = new Set([...all(), ...shared].map((m) => m.index));
  const dummy = new Set<string>();
  const flows = valid.map((f): RankedFlow => {
    const [a, b] = [at(f.from), at(f.to)];
    const plain = { index: f.index, from: f.from, to: f.to, dummies: [] };
    if (side.has(f.index)) return { ...plain, back: false, side: true };
    if (b <= a) return { ...plain, back: true, side: false };
    const dummies = Array.from({ length: b - a - 1 }, (_, k) => {
      const id = `~${f.index}.${k}`;
      dummy.add(id);
      layerOf.set(id, a + k + 1);
      laneOf.set(id, laneOf.get(f.from) ?? 0);
      return id;
    });
    return { ...plain, back: false, side: false, dummies, ...(isHandlerFlow(f) ? { handler: true as const } : {}) };
  });
  const layers = Math.max(0, ...layerOf.values()) + 1;
  return { ids: [...ids, ...dummy], dummy, layerOf, laneOf, flows, layers };
}
