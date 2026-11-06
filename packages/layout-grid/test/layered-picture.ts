import { type GraphContainer, type GraphEdge, type GraphNode, type LayeredMetrics, layoutGraph } from '../src/index.js';

/** A picture as the tests of the layered stages write it: boxes, edges, the layers a kind gives, frames. */
export interface Picture {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly layers?: readonly (readonly string[])[];
  /** Whether the order may change within the given layers (`given.order` `free`). */
  readonly reorder?: boolean;
  readonly frames?: readonly Omit<GraphContainer, 'kind'>[];
}

/** Lays such a picture out as a layout graph with `metrics`. */
export const layWith =
  (metrics: LayeredMetrics) =>
  ({ nodes, edges, layers, reorder, frames = [] }: Picture) =>
    layoutGraph({
      nodes,
      edges,
      metrics,
      containers: frames.map((f) => ({ ...f, kind: 'frame' as const })),
      ...(layers ? { given: { ranks: layers, ...(reorder ? { order: 'free' as const } : {}) } } : {}),
    });
