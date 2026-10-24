import type { LayerEdge } from './graph.js';

/** Topological order of the ranked edges, ties in declaration order. The graph has no cycle. */
function topological(nodes: readonly string[], edges: readonly LayerEdge[]): string[] {
  const indegree = new Map(nodes.map((n) => [n, 0]));
  for (const e of edges) indegree.set(e.to, (indegree.get(e.to) ?? 0) + 1);
  const order: string[] = [];
  const ready = nodes.filter((n) => indegree.get(n) === 0);
  for (let n = ready.shift(); n !== undefined; n = ready.shift()) {
    order.push(n);
    for (const e of edges.filter((x) => x.from === n)) {
      const left = (indegree.get(e.to) ?? 0) - 1;
      indegree.set(e.to, left);
      if (left === 0) ready.push(e.to);
    }
    ready.sort((a, b) => nodes.indexOf(a) - nodes.indexOf(b));
  }
  return order;
}

/**
 * Longest path: every source on top, every other node one layer below its deepest predecessor. Then sources move
 * down to just above their highest child, so edges stay short.
 */
function longestPath(nodes: readonly string[], ranked: readonly LayerEdge[]): Map<string, number> {
  const order = topological(nodes, ranked);
  const layer = new Map<string, number>();
  for (const n of order) {
    const preds = ranked.filter((e) => e.to === n).map((e) => (layer.get(e.from) ?? 0) + 1);
    layer.set(n, Math.max(0, ...preds));
  }
  for (const n of [...order].reverse()) {
    if (ranked.some((e) => e.to === n)) continue;
    const kids = ranked.filter((e) => e.from === n).map((e) => layer.get(e.to) ?? 0);
    if (kids.length) layer.set(n, Math.min(...kids) - 1);
  }
  return layer;
}

/**
 * Layer per node. Nodes without ranked edges join the layer of their first neighbour already placed, so the line
 * can run horizontally; nodes without one go on top.
 */
export function assignLayers(
  nodes: readonly string[],
  ranked: readonly LayerEdge[],
  side: readonly LayerEdge[],
): Map<string, number> {
  const touched = new Set(ranked.flatMap((e) => [e.from, e.to]));
  const layer = longestPath(
    nodes.filter((n) => touched.has(n)),
    ranked,
  );
  for (let changed = true; changed; ) {
    changed = false;
    for (const n of nodes) {
      if (layer.has(n)) continue;
      const peer = side.find((e) => (e.from === n && layer.has(e.to)) || (e.to === n && layer.has(e.from)));
      if (!peer) continue;
      layer.set(n, layer.get(peer.from === n ? peer.to : peer.from) ?? 0);
      changed = true;
    }
  }
  for (const n of nodes) if (!layer.has(n)) layer.set(n, 0);
  return layer;
}
