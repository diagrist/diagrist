/**
 * An edge for the layering. `rank` 1 puts `to` below `from`; `rank` 0 wants both side by side in one layer. The
 * layering knows ids and edges only, never a diagram kind.
 */
export interface LayerEdge {
  readonly from: string;
  readonly to: string;
  readonly rank: 0 | 1;
}

/**
 * Ids in declaration order, which breaks every tie, and the most nodes a layer may hold before it wraps. Nodes in
 * `last`, such as the ends of a flow, go below every other node of their part.
 */
export interface LayerGraph {
  readonly nodes: readonly string[];
  readonly edges: readonly LayerEdge[];
  readonly maxPerLayer: number;
  readonly last?: readonly string[];
  /** Searches harder for an order without crossings: for pictures where every crossing shows, at more cost in time. */
  readonly thorough?: boolean;
  /**
   * The layer of every node as the kind decides it, such as a column per type of thing; then edges set only the
   * order within the layers. A node it leaves out stands in the first layer.
   */
  readonly fixed?: ReadonlyMap<string, number>;
}

/** Layers from top to bottom and a position per node in half columns; neighbours in a layer stand at least 1 apart. */
export interface Layered {
  readonly layers: readonly (readonly string[])[];
  readonly position: ReadonlyMap<string, number>;
}

/** Neighbours per node, without direction, in edge order and without repeats. */
export function neighbours(graph: Pick<LayerGraph, 'nodes' | 'edges'>): Map<string, string[]> {
  const out = new Map<string, string[]>(graph.nodes.map((n) => [n, []]));
  const link = (a: string, b: string) => {
    const list = out.get(a);
    if (list && a !== b && !list.includes(b)) list.push(b);
  };
  for (const e of graph.edges) {
    link(e.from, e.to);
    link(e.to, e.from);
  }
  return out;
}

/**
 * Breaks cycles of ranked edges: a depth-first search in declaration order turns every back edge around. Loops add
 * nothing to the layering and are dropped.
 */
export function acyclic(nodes: readonly string[], edges: readonly LayerEdge[]): LayerEdge[] {
  const ranked = edges.filter((e) => e.rank === 1 && e.from !== e.to);
  const out = new Map<string, LayerEdge[]>(nodes.map((n) => [n, []]));
  for (const e of ranked) out.get(e.from)?.push(e);
  const state = new Map<string, 'open' | 'done'>();
  const reversed = new Set<LayerEdge>();
  const visit = (n: string): void => {
    state.set(n, 'open');
    for (const e of out.get(n) ?? []) {
      const s = state.get(e.to);
      if (s === 'open') reversed.add(e);
      else if (s === undefined) visit(e.to);
    }
    state.set(n, 'done');
  };
  for (const n of nodes) if (!state.has(n)) visit(n);
  return ranked.map((e) => (reversed.has(e) ? { from: e.to, to: e.from, rank: 1 } : e));
}
