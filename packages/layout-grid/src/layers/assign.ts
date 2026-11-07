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

/** The layers of the ends of each line `box` hangs from by `edges`, grouped by the key of the hanging. */
function hungFrom(box: string, edges: readonly LayerEdge[], layer: ReadonlyMap<string, number>): number[][] {
  const ends = new Map<string, number[]>();
  for (const e of edges) {
    if (e.hang?.box !== box) continue;
    const end = layer.get(e.from === box ? e.to : e.from) ?? 0;
    ends.set(e.hang.key, [...(ends.get(e.hang.key) ?? []), end]);
  }
  return [...ends.values()];
}

/**
 * The least layer of `n` its edges from above allow: one below each predecessor, but for a box hanging below a line
 * (`LayerEdge.hang`) one below the upper end of the line and level with the lower one, so it hangs beside the line.
 * The edges of a box hanging above a line hold nothing here.
 */
function leastLayer(n: string, ranked: readonly LayerEdge[], layer: ReadonlyMap<string, number>): number {
  const into = ranked.filter((e) => e.to === n && e.hang?.box !== e.from);
  const hung = hungFrom(n, into, layer).map((at) => Math.max(Math.min(...at) + 1, ...at));
  const plain = into.filter((e) => e.hang === undefined).map((e) => (layer.get(e.from) ?? 0) + 1);
  return Math.max(0, ...plain, ...hung);
}

/**
 * Longest path: every source on top, every other node one layer below its deepest predecessor (`leastLayer`). Then
 * sources move down to just above their highest child, so edges stay short, and a box hanging above a line to one
 * above its lower end and level with its upper one. Layers count from 0 again after.
 */
function longestPath(nodes: readonly string[], ranked: readonly LayerEdge[]): Map<string, number> {
  const order = topological(nodes, ranked);
  const layer = new Map<string, number>();
  for (const n of order) layer.set(n, leastLayer(n, ranked, layer));
  for (const n of [...order].reverse()) {
    if (ranked.some((e) => e.to === n && e.hang?.box !== e.from)) continue;
    const out = ranked.filter((e) => e.from === n);
    const kids = out.filter((e) => e.hang === undefined).map((e) => (layer.get(e.to) ?? 0) - 1);
    const hung = hungFrom(n, out, layer).map((at) => Math.min(Math.max(...at) - 1, ...at));
    if (kids.length + hung.length > 0) layer.set(n, Math.min(...kids, ...hung));
  }
  const top = Math.min(0, ...layer.values());
  return new Map([...layer].map(([n, l]) => [n, l - top]));
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
