import type { Placed } from '@diagrist/core';

/** A box of a layered picture: its measures, the cluster it keeps near, and its outline. */
export interface LayeredNode {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  /** Nodes of one cluster, such as one area, stand together in their layer where that costs no crossing. */
  readonly cluster?: string;
  readonly shape?: 'box' | 'ellipse';
  readonly source?: Placed['span'];
}

/**
 * A connection of a layered picture. `rank` 1 puts `to` below `from`, -1 above it, as a broader term above a
 * narrower one, and 0 beside it in the same layer. A line is drawn from `from` to `to` with its head at `to`,
 * whichever way the layers run.
 */
export interface LayeredEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly rank: 1 | 0 | -1;
  /** 1 by default; 2 for a main path, which then stands straight and in the middle first. */
  readonly weight?: number;
  /**
   * Edges of the same key may share one trunk: those leaving one node as a fan, those entering one node as a
   * collector, each line keeping its own head. Edges without a key never share.
   */
  readonly bundle?: string;
  /**
   * The label of the edge, measured by the kind: its text, its width and the size of its font. It stands beside the
   * start of the line, or beside the trunk the edge shares, once per trunk.
   */
  readonly label?: { readonly text: string; readonly width: number; readonly size: number };
  readonly source?: Placed['span'];
}

/** The measures of a layered picture, in pixels. */
export interface LayeredMetrics {
  /** Least gap between two boxes in one layer. */
  readonly colGap: number;
  /** Least gap between two layers, also when no line needs a track there. */
  readonly rowGapMin: number;
  /** Distance between two tracks of horizontal pieces in one gap. */
  readonly track: number;
  /** Distance between two ends on one side of a box. */
  readonly portGap: number;
  /** Straight run of a line into its head. */
  readonly lead: number;
  /** Straight run of a line out of its start. */
  readonly tail: number;
  /** Gap between a label and its line. */
  readonly labelGap: number;
  /** Left edge of the leftmost box. */
  readonly left: number;
  /** Top edge of the first layer. */
  readonly top: number;
}

/**
 * A hub picture (plan 4.7): the boxes of the core are laid out first, every other cluster docks at the side of the
 * core where it meets it, with its lines pointing into the core, and the core stands in a light frame with a head.
 */
export interface Hub {
  readonly core: readonly string[];
  /** The head of the frame around the core, measured by the kind. */
  readonly head: { readonly text: string; readonly width: number; readonly size: number };
  /** Room between the frame and the boxes of the core. */
  readonly pad: number;
}

/** A layered picture to lay out: boxes, edges and measures, and optionally a hub. */
export interface LayeredSpec {
  readonly nodes: readonly LayeredNode[];
  readonly edges: readonly LayeredEdge[];
  readonly metrics: LayeredMetrics;
  readonly hub?: Hub;
}
