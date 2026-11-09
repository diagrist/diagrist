import type { Span } from '@diagrist/lang';
import type { Point, Rect } from './geometry.js';

/**
 * The geometric form of a node's body: a plain or rounded rectangle, an ellipse, a diamond, a cylinder lying upright
 * (`cylinder`) or on its side (`queue`), a sheet with a folded corner (`file`), a circle, or a `symbol`, a figure
 * no plain outline describes, such as a stick figure or a bar.
 */
export type NodeForm = 'box' | 'rounded' | 'ellipse' | 'diamond' | 'cylinder' | 'queue' | 'file' | 'circle' | 'symbol';

/** Where a node or group sits, and the DOM id of its `<g>` in the SVG. */
export interface NodeAnchor {
  readonly id: string;
  readonly domId: string;
  readonly rect: Rect;
  /**
   * The geometric form of the node's body, for exporters that draw native shapes; a kind that leaves it out gets its
   * form read from the scene. Groups leave it out.
   */
  readonly form?: NodeForm;
}

/** An edge as drawn: its polyline and the DOM ids of its `<g>` and of its label, if the label has its own. */
export interface EdgeAnchor {
  readonly index: number;
  readonly from: string;
  readonly to: string;
  readonly domId: string;
  readonly labelId?: string;
  readonly points: readonly Point[];
  /** The source line that declares the edge, so the line check points at it; absent where a kind does not know it. */
  readonly span?: Span;
  /**
   * The bus the edge runs on: one shared line that every edge of a complete set of pairs joins, each from its first
   * end and to its second, which the line check reads as one bundle.
   */
  readonly bus?: string;
}

/**
 * Positions that embeddings such as animations use to find and move parts of the SVG. Part of the SVG
 * contract together with the DOM ids from `domId`.
 */
export interface Anchors {
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly NodeAnchor[];
  readonly groups: readonly NodeAnchor[];
  readonly edges: readonly EdgeAnchor[];
}

/** DOM ids of the `<g>` elements: `node-<id>`, `group-<id>`, `edge-<index>`, `label-<index>`. */
export const domId: {
  readonly node: (id: string) => string;
  readonly group: (id: string) => string;
  readonly edge: (index: number) => string;
  readonly label: (index: number) => string;
} = {
  node: (id) => `node-${id}`,
  group: (id) => `group-${id}`,
  edge: (index) => `edge-${index}`,
  label: (index) => `label-${index}`,
};
