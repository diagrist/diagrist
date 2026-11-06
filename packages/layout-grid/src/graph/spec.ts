import type { Placed } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { LayeredMetrics } from '../layered/spec.js';

/** A box of a layout graph, measured by its kind. */
export interface GraphNode {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  /**
   * `bar` is a node drawn across its branches, splitting or merging them: it stretches over their ends, which leave
   * it straight above or below their other end (`graph/bars.ts`, `layered/bar-docks.ts`).
   */
  readonly shape?: 'box' | 'ellipse' | 'bar';
  /**
   * The frame or node whose outline the node sits on, such as a point of a box that holds others: a line through it
   * runs straight across the outline, the node centred where it crosses (`graph/docks.ts`).
   */
  readonly dock?: string;
  /**
   * The sides ends may take, each at the middle of its side, as at the corners of a diamond: ends on the top and
   * bottom meet in one point, and the outermost line whose other end lies beyond the box leaves or enters it at the
   * middle of that side where the row between is free (ADR 0039).
   */
  readonly sides?: readonly Side[];
  /** How far texts the kind sets beside the node reach out of it; no other box comes nearer. */
  readonly reach?: { readonly left: number; readonly right: number };
  /** Nodes of one cluster, such as one area, stand together in their layer where that costs no crossing. */
  readonly cluster?: string;
  readonly source?: Placed['span'];
}

/** The text of an edge, measured by its kind: its width, its font size and, where it wraps, its lines. */
export interface GraphLabel {
  readonly text: string;
  readonly width: number;
  readonly size: number;
  readonly lines?: readonly { readonly text: string; readonly width: number }[];
}

/**
 * How an edge orders the layers: `down` puts `to` below `from`, `up` above it, `beside` in the same layer, and
 * `free` would rather have both beside each other but lets a leaf stand above or below where its layer is full.
 */
export type GraphRank = 'down' | 'up' | 'beside' | 'free';

/**
 * A connection of a layout graph, drawn from `from` to `to` with its head at `to`, whichever way the layers run.
 * Either end may name a frame of kind `frame`: the line then ends on its outline. An edge from a node to itself
 * is a loop.
 */
export interface GraphEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly rank: GraphRank;
  /** `soft` for a secondary line: its bends weigh half, and boxes stay centred on the other lines. */
  readonly strength?: 'hard' | 'soft';
  /** 1 by default; 2 for a main path, which then stands straight and in the middle first. */
  readonly weight?: number;
  /** Edges of one key may share a trunk, as a fan out of one node or a join into one. */
  readonly bundle?: string;
  /**
   * `whole` keeps every edge of the bundle on one trunk at its shared node, however the other ends stand, for
   * notations that draw one symbol at that node for all of them; by default a trunk only gathers ends that stand
   * side by side, with no foreign box between them.
   */
  readonly trunk?: 'whole';
  readonly label?: GraphLabel;
  /**
   * How the line runs: `orthogonal` between layers and beside them, `loop` out of a side of its box and back into
   * it, which an edge from a node to itself takes anyway, and `rail` like `orthogonal` but, where it runs up the
   * layers or past a layer, on a rail beside them: out of a side of `from`, beside everything between and into that
   * side of `to`; `back` takes a rail only where it runs up the layers, as a loop back does.
   */
  readonly profile?: 'orthogonal' | 'loop' | 'rail' | 'back';
  /** Not drawn: the edge only holds its ends near each other in layers and places. */
  readonly hidden?: boolean;
  /** The least straight run out of `from` and into `to`, for symbols and texts at the ends. */
  readonly run?: { readonly from?: number; readonly to?: number };
  /** The least distance between the ends when the edge is drawn beside, between neighbours of one layer. */
  readonly room?: number;
  readonly source?: Placed['span'];
}

/**
 * A frame of a layout graph around some of its nodes, of one of four kinds. A `frame` holds its members and the
 * frames inside it as one block of layers, and edges may end on it; `core` is the core of a hub, which the other
 * clusters dock at, in a light frame with a head that names it. A `lane` is a hard column (layout plan P9): lanes
 * stand side by side in the order given, every layer keeps them so, and an edge ranked `beside` between two lanes
 * puts its ends in one layer; a lane is at least as wide as its head and reaches `top` above the first layer.
 * `part`, a part of a box that holds others (P8), is laid out as a frame and then stretched with its siblings until
 * together they fill their parent, side by side or stacked (`graph/parts.ts`).
 */
export interface GraphContainer {
  readonly id: string;
  readonly kind: 'frame' | 'lane' | 'part' | 'core';
  readonly members: readonly string[];
  readonly parent?: string;
  /** Room between the frame and what it holds at the sides and the bottom, and at the top. */
  readonly pad: number;
  readonly top: number;
  /** The head at the top left corner, measured by the kind; a core's head names it with `text` in a font of `size`. */
  readonly head: { readonly width: number; readonly height: number; readonly text?: string; readonly size?: number };
  /** The head stands on the frame as a tab, so its outline runs `head.height` below its top. */
  readonly tab?: boolean;
}

/** What the kind decides instead of the stages, and how the stages arrange the rest. */
export interface GraphGiven {
  /** The layers, top first, as the kind decides them, such as columns per type; else the edges decide. */
  readonly ranks?: readonly (readonly string[])[];
  /** With `ranks`: `kept` keeps the order of every layer as given, `free` lets the order stage choose it. */
  readonly order?: 'kept' | 'free';
  /**
   * `layers` (the default) lays the graph out in layers along its edges; `hub` lays out the members of the `core`
   * frame first and docks every other cluster at the side of the core where it meets it.
   */
  readonly arrangement?: 'layers' | 'hub';
  /**
   * With it, layers take `free` ranks, pack leaves around their node by area and hold frames as blocks, no layer
   * over so many boxes, and a frame that hangs at one other is tried beside, above and below it.
   */
  readonly perLayer?: number;
  /** With `perLayer`: nodes that stand below every other node of their frame, such as the ends of a flow. */
  readonly last?: readonly string[];
  /** `right` turns the layers across: they run left to right, the picture laid out down and turned (`graph/turn.ts`). */
  readonly direction?: 'down' | 'right';
}

/**
 * The public contract of the layout engine (layout plan 2.2, ADR 0039): what stands in a picture and what freedom it
 * has, as data; `layoutGraph` decides where. Nothing in it names a kind.
 */
export interface LayoutGraph {
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly containers?: readonly GraphContainer[];
  readonly given?: GraphGiven;
  readonly metrics: LayeredMetrics;
}
