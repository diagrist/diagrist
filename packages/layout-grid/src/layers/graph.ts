/**
 * An edge for the layering. `rank` 1 puts `to` below `from`; `rank` 0 wants both side by side in one layer;
 * `free` would rather have them side by side, but lets a leaf at one end, a node with no other edge, stand above or
 * below the other end where its layer has no room (layout plan R4). The layering knows ids and edges only, never a
 * diagram kind.
 */
export interface LayerEdge {
  readonly from: string;
  readonly to: string;
  readonly rank: 0 | 1 | 'free';
  /**
   * On the two edges between a box hanging from a line and the ends of the line, keyed by the hanging: from the ends
   * down to a box hanging below, it stands one layer below the upper end and never above the lower one; from a box
   * hanging above down to the ends, one layer above the lower end and never below the upper one (`longestPath`).
   */
  readonly hang?: { readonly key: string; readonly box: string };
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
  /** How much room each node takes, such as its area; of the leaves of `free` edges, the small ones stay beside. */
  readonly sizes?: ReadonlyMap<string, number>;
  /**
   * How many places each node takes in its layer, 1 by default, such as a frame laid out as a block of its own:
   * layers fill, wrap and take leaves by these places rather than by the count of their nodes.
   */
  readonly widths?: ReadonlyMap<string, number>;
  /**
   * Frames around nodes: each frame's nodes stand in a block of layers of their own, laid out first, and the frame
   * then takes part in the layering of its parent like one node as wide as its widest layer and as high as its
   * layers, the edges of its nodes lifted to it (`layerNested`).
   */
  readonly frames?: readonly LayerFrame[];
  /**
   * Where some leaves of `free` edges stand by their node, as a search tries it: -1 in the row above, 0 beside, 1 in
   * the row below. The others take the first of these with room.
   */
  readonly moves?: ReadonlyMap<string, -1 | 0 | 1>;
  /**
   * Nodes that stand for a frame laid out as a block of its own (`layerNested`). One whose edges are all `free` is a
   * leaf of its strongest partner however many partners it has (`freeBlocks`).
   */
  readonly blocks?: ReadonlySet<string>;
  /**
   * Nodes that stand beside the last layer of a frame they round-trip, with an edge from the frame and one back into
   * it, as a search tries it (`roundTrips`); the others stand below the frame, as their edges rank them.
   */
  readonly trips?: ReadonlySet<string>;
}

/** A frame around nodes for the layering: the nodes directly in it and the frame it stands in. */
export interface LayerFrame {
  readonly id: string;
  readonly members: readonly string[];
  readonly parent?: string;
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
