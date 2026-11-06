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
   * `soft` for a secondary line, such as a dashed one beside a hierarchy: its bends weigh half, and boxes stay centred
   * on the other lines rather than leave their parent to straighten it. `hard` by default.
   */
  readonly strength?: 'hard' | 'soft';
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
  /**
   * The edge is not drawn: it only holds its ends near each other in layers and places, such as a box hung below
   * the line it belongs to. It takes no port and no track and gets no route.
   */
  readonly hidden?: boolean;
  /**
   * The least straight run out of `from` and into `to`, where the kind draws symbols and texts at the ends of the
   * line; never less than `tail` and `lead` of the metrics.
   */
  readonly run?: { readonly from?: number; readonly to?: number };
  /** The least distance between `from` and `to` when the edge is drawn beside, between neighbours of one layer. */
  readonly room?: number;
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

/**
 * A frame around boxes, such as a named group of them: a rectangle `pad` away from what it holds at the
 * sides and the bottom and `top` away at the top, where its head stands at the left. Boxes of other frames keep
 * outside it, and lines crossing its top keep clear of its head.
 */
export interface LayeredFrame {
  readonly id: string;
  /** The boxes directly in the frame; those of frames inside it belong to it as well. */
  readonly members: readonly string[];
  /** The frame this one stands in. */
  readonly parent?: string;
  readonly pad: number;
  readonly top: number;
  /** The head at the top left corner, inside the room `top`. */
  readonly head: { readonly width: number; readonly height: number };
}

/** A layered picture to lay out: boxes, edges and measures, and optionally a hub. */
export interface LayeredSpec {
  readonly nodes: readonly LayeredNode[];
  readonly edges: readonly LayeredEdge[];
  readonly metrics: LayeredMetrics;
  readonly hub?: Hub;
  /**
   * The layers, top first, and the order of the boxes in each, as the kind arranged them; placeholders of long
   * edges are ordered in between. Without it, the edges decide both.
   */
  readonly layers?: readonly (readonly string[])[];
  /**
   * With `layers`, take from them only the layer of every box and order each layer anew, as without them.
   */
  readonly reorder?: boolean;
  /**
   * Frames around boxes, drawn parents first. The order keeps the boxes of each frame together in every layer it
   * spans and frames in one order in every layer they share; with `layers` kept as given, the kind does so.
   */
  readonly frames?: readonly LayeredFrame[];
}
