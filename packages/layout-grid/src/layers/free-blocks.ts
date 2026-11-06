import type { LayerEdge } from './graph.js';

/**
 * Blocks of frames whose edges are all `free`, each with its strongest partner: the one it has the most edges with,
 * then the one with the most edges of its own, then the one met last in edge order. Such a frame may stand beside that
 * partner, above or below it like a leaf, while its other partners keep their `free` edges to it. Partners must have
 * other edges, as for leaves.
 */
export function freeBlocks(
  blocks: ReadonlySet<string> | undefined,
  edges: readonly LayerEdge[],
  degree: ReadonlyMap<string, number>,
): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of blocks ?? []) {
    const own = edges.filter((e) => e.from === block || e.to === block);
    if (own.length === 0 || own.some((e) => e.rank !== 'free')) continue;
    const count = new Map<string, number>();
    for (const e of own) {
      const partner = e.from === block ? e.to : e.from;
      count.set(partner, (count.get(partner) ?? 0) + 1);
    }
    const partners = [...count.keys()].filter((p) => (degree.get(p) ?? 0) > (count.get(p) ?? 0));
    const best = partners.reduce<string | undefined>((a, b) => {
      if (a === undefined) return b;
      const by = (count.get(b) ?? 0) - (count.get(a) ?? 0) || (degree.get(b) ?? 0) - (degree.get(a) ?? 0);
      return by >= 0 ? b : a;
    }, undefined);
    if (best !== undefined) out.set(block, best);
  }
  return out;
}
