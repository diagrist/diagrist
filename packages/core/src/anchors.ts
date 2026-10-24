import type { Point, Rect } from './geometry.js';

/** Where a node or group sits, and the DOM id of its `<g>` in the SVG. */
export interface NodeAnchor {
  readonly id: string;
  readonly domId: string;
  readonly rect: Rect;
}

/** An edge as drawn: its polyline and the DOM ids of its `<g>` and of its label, if the label has its own. */
export interface EdgeAnchor {
  readonly index: number;
  readonly from: string;
  readonly to: string;
  readonly domId: string;
  readonly labelId?: string;
  readonly points: readonly Point[];
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
