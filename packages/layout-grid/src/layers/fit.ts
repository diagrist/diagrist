import type { LayerEdge } from './graph.js';

/**
 * A node and what has to move down with it to keep every ranked edge pointing down and every edge of rank 0 in one
 * layer: its descendants along `ranked`, and the partners of rank 0 of all of them.
 */
function closureOf(
  start: string,
  down: ReadonlyMap<string, readonly string[]>,
  beside: ReadonlyMap<string, readonly string[]>,
) {
  const moving = new Set([start]);
  for (const n of moving) for (const m of [...(down.get(n) ?? []), ...(beside.get(n) ?? [])]) moving.add(m);
  return moving;
}

/**
 * Layers too full made to fit by moving a parent down with all below it (layout plan R4, `wrap` that knows parents):
 * from the top, while a layer holds more than `max` nodes, of the nodes above it whose move takes nodes out of it,
 * the one that leaves it fullest within `max`, counted in the `places` of its nodes,, and no other layer over `max` that was not, moves down one layer with
 * its descendants and the nodes beside them, so a family stays together where `wrap` would cut off its last
 * members. Ties go to the fewest nodes moved, then the first declared. A layer no move relieves stays as it is, for
 * the caller to wrap.
 */
export function fitLayers(
  nodes: readonly string[],
  ranked: readonly LayerEdge[],
  side: readonly LayerEdge[],
  layer: ReadonlyMap<string, number>,
  max: number,
  places: (n: string) => number,
): Map<string, number> {
  const out = new Map(layer);
  const down = new Map<string, string[]>();
  for (const e of ranked) down.set(e.from, [...(down.get(e.from) ?? []), e.to]);
  const beside = new Map<string, string[]>();
  for (const e of side.filter((x) => x.rank === 0))
    for (const [a, b] of [
      [e.from, e.to],
      [e.to, e.from],
    ] as const)
      beside.set(a, [...(beside.get(a) ?? []), b]);
  const count = (l: number, map: ReadonlyMap<string, number>) =>
    nodes.reduce((sum, n) => sum + (map.get(n) === l ? places(n) : 0), 0);
  const deepest = () => Math.max(0, ...out.values());
  for (let l = 0, guard = 0; l <= deepest() && guard < nodes.length; ) {
    const full = count(l, out);
    if (full <= max) {
      l++;
      continue;
    }
    guard++;
    const options = nodes.flatMap((n) => {
      if ((out.get(n) ?? 0) >= l) return [];
      const moving = closureOf(n, down, beside);
      const tried = new Map(out);
      for (const m of moving) tried.set(m, (tried.get(m) ?? 0) + 1);
      const left = count(l, tried);
      const over = [...new Set(tried.values())].filter(
        (k) => k !== l && count(k, tried) > Math.max(max, count(k, out)),
      );
      return left < full && over.length === 0 ? [{ tried, left, size: moving.size }] : [];
    });
    const fits = (o: { left: number }) => (o.left <= max ? 0 : 1);
    const best = options.sort((a, b) => fits(a) - fits(b) || b.left - a.left || a.size - b.size)[0];
    if (best === undefined) {
      l++;
      continue;
    }
    for (const [n, k] of best.tried) out.set(n, k);
  }
  return out;
}
