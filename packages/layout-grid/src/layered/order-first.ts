import type { LayeredSpec } from './spec.js';

/**
 * The pairs of nodes an edge beside asks to stand in a given order in their layer (`LayeredEdge.first`), the one to
 * stand first before the other.
 */
export function firstPairs(spec: LayeredSpec): readonly (readonly [string, string])[] {
  return spec.edges.flatMap((e) =>
    e.first === undefined ? [] : [e.first === 'to' ? ([e.to, e.from] as const) : ([e.from, e.to] as const)],
  );
}

/** How many of `pairs` stand the other way round in one layer. */
export function firstBroken(layers: readonly string[][], pairs: readonly (readonly [string, string])[]): number {
  if (pairs.length === 0) return 0;
  const at = new Map(layers.flatMap((layer) => layer.map((n, i) => [n, { layer, i }] as const)));
  return pairs.filter(([a, b]) => {
    const [p, q] = [at.get(a), at.get(b)];
    return p !== undefined && q !== undefined && p.layer === q.layer && p.i > q.i;
  }).length;
}
