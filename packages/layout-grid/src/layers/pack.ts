import { freeBlocks } from './free-blocks.js';
import type { LayerGraph } from './graph.js';

/** `by` more of `key`, one by default. */
const bump = <K>(map: Map<K, number>, key: K, by = 1) => map.set(key, (map.get(key) ?? 0) + by);

/** Places beside a node for its leaves, one at each side, and as many in the row above it and in the row below. */
const NEAR = 2;

/**
 * The leaves of `free` edges, each with its node: nodes whose one edge is `free` and whose partner has others, and
 * blocks of frames whose edges are all `free` (`freeBlocks`).
 */
export function leavesOf(graph: LayerGraph): Map<string, string> {
  const edges = graph.edges.filter((e) => e.from !== e.to);
  const degree = new Map<string, number>();
  for (const e of edges) for (const n of [e.from, e.to]) bump(degree, n);
  const leafOf = new Map<string, string>();
  for (const e of edges)
    for (const [leaf, node] of [
      [e.from, e.to],
      [e.to, e.from],
    ] as const)
      if (e.rank === 'free' && degree.get(leaf) === 1 && (degree.get(node) ?? 0) > 1) leafOf.set(leaf, node);
  for (const [leaf, node] of freeBlocks(graph.blocks, edges, degree)) if (!leafOf.has(leaf)) leafOf.set(leaf, node);
  return leafOf;
}

/**
 * The leaves of `free` edges packed around their node (layout plan R4): a leaf, a node whose one edge is `free`,
 * stands beside its node while it has a place there, else in the layer above, else in the layer below, each holding
 * at most `NEAR` of the node's leaves and no more than `maxPerLayer` places (`widths`); the smallest leaves are placed first.
 * A node's other neighbours in its layer take places beside it too. Where no place is left, a leaf stays beside.
 * Layers may run below 0; the caller compacts them.
 */
export function packLeaves(
  graph: LayerGraph,
  layer: ReadonlyMap<string, number>,
  leafOf: ReadonlyMap<string, string>,
): Map<string, number> {
  const edges = graph.edges.filter((e) => e.from !== e.to);
  const out = new Map(layer);
  if (leafOf.size === 0) return out;
  const count = new Map<number, number>();
  const taken = new Map<string, number>();
  const places = (n: string) => graph.widths?.get(n) ?? 1;
  for (const n of graph.nodes) if (!leafOf.has(n)) bump(count, layer.get(n) ?? 0, places(n));
  for (const e of edges)
    for (const [a, b] of [
      [e.from, e.to],
      [e.to, e.from],
    ] as const)
      if (e.rank !== 1 && !leafOf.has(b) && layer.get(a) === layer.get(b)) bump(taken, `${a}:0`);
  const size = (n: string) => graph.sizes?.get(n) ?? 0;
  const order = (n: string) => graph.nodes.indexOf(n);
  const leaves = [...leafOf.keys()].sort((a, b) => size(a) - size(b) || order(a) - order(b));
  for (const leaf of leaves) {
    const node = leafOf.get(leaf) as string;
    const at = out.get(node) ?? 0;
    const dl =
      graph.moves?.get(leaf) ??
      [0, -1, 1].find(
        (d) => (taken.get(`${node}:${d}`) ?? 0) < NEAR && (count.get(at + d) ?? 0) + places(leaf) <= graph.maxPerLayer,
      ) ??
      0;
    out.set(leaf, at + dl);
    bump(taken, `${node}:${dl}`);
    bump(count, at + dl, places(leaf));
  }
  return out;
}
