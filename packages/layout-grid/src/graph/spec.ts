import type { Placed } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { LayeredMetrics } from '../layered/spec.js';
import type { GraphCells } from './cells.js';

/** A box of a layout graph, measured by its kind. */
export interface GraphNode {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  /**
   * `bar` is a node drawn across its branches, splitting or merging them: it stretches over their ends, which leave
   * it straight above or below their other end (`graph/bars.ts`, `layered/bar-docks.ts`). `diamond` leaves the trunk
   * of a fan or join at its vertex when no member stands within its reach (`layered/ports.ts`).
   */
  readonly shape?: 'box' | 'ellipse' | 'bar' | 'diamond';
  /**
   * The radius of its corners as the kind draws them, 0 for square ones: an end the port stage shifts toward a corner
   * stays off its rounding (`layered/port-row.ts`). Without it, ends keep the inset of 16 px from every corner.
   */
  readonly corner?: number;
  /** The frame or node whose outline the node sits on, centred where a line through it crosses (`graph/docks.ts`). */
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
  /**
   * The part of the box at its top middle that straight lines end on, such as a figure above its name or an ellipse
   * above room kept for a note: a line that would leave a body that is no ellipse downwards through the rest of the
   * box ends below the box instead (`graph/straight.ts`).
   */
  readonly body?: { readonly width: number; readonly height: number };
  readonly source?: Placed['span'];
}

/** The text of an edge, measured by its kind: its width, its font size and, where it wraps, its lines. */
export interface GraphLabel {
  readonly text: string;
  readonly width: number;
  readonly size: number;
  readonly lines?: readonly { readonly text: string; readonly width: number }[];
  /** `start` for a text that belongs at the start of its line, such as a guard: sought from there (`EdgeText.at`). */
  readonly at?: 'start' | 'middle';
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
   * side of `to`; `back` takes a rail only where it runs up the layers, as a loop back does. `straight` is one
   * slanted piece from outline to outline on the line between the middles, drawn once the boxes stand, its texts
   * along it (`graph/straight.ts`); it orders and places the boxes as any edge does, but takes no port and no track.
   */
  readonly profile?: 'orthogonal' | 'loop' | 'rail' | 'back' | 'straight';
  /**
   * With rank `beside`, the end that stands first in the layer: left of the other, or above it where the layers run
   * right, such as a general box above its special one.
   */
  readonly first?: 'from' | 'to';
  /** Texts at the ends of a `straight` line, such as multiplicities, each a little back from its end. */
  readonly ends?: { readonly from?: GraphLabel; readonly to?: GraphLabel };
  /** Not drawn: the edge only holds its ends near each other in layers and places. */
  readonly hidden?: boolean;
  /**
   * `to` names an edge, not a node: `from` hangs from that line, such as a box that describes the line itself. It
   * stands in the layer of the line's lower end, one below where both ends share a layer (above with rank `up`, which
   * `either` may turn to), near where the line passes, and a line without head runs from a straight piece of that
   * line to the middle of a side of `from`, as clear and short as it can (`layered/tethers.ts`), measured as any line.
   */
  readonly hang?: true;
  /**
   * With rank `up` or `down`, `to` may stand on the other side of `from` where that clearly saves crossings, such as a
   * contract drawn below the boxes that fulfil it (`graph/either.ts`); all such edges into one node turn together.
   */
  readonly either?: boolean;
  /** The least straight run out of `from` and into `to`, for symbols and texts at the ends. */
  readonly run?: { readonly from?: number; readonly to?: number };
  /** The room an end takes along its side to its right, such as a pin with its name (`layered/port-row.ts`). */
  readonly slot?: { readonly from?: number; readonly to?: number };
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
  /**
   * The head at the top left corner, measured by the kind; a core's head names it with `text` in a font of `size`. A
   * line passing the head keeps `air` beside it, 12 unless the kind gives more.
   */
  readonly head: {
    readonly width: number;
    readonly height: number;
    readonly text?: string;
    readonly size?: number;
    readonly air?: number;
  };
  /** The head stands on the frame as a tab, so its outline runs `head.height` below its top. */
  readonly tab?: boolean;
  /**
   * No line runs through the frame that neither starts nor ends in it: where the frame lies wholly between the ends
   * of such a line, the line goes round it as round a box, however long the way (owner decision B of 06.11.2026).
   * Without it such a line runs through where that is shorter than going round (ADR 0039, 8).
   */
  readonly opaque?: boolean;
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
  /** With `direction: 'right'`: the members of every frame packed in their columns (`graph/straight-pack.ts`). */
  readonly pack?: boolean;
  /**
   * The author's grid: every node in its cell, frames around their members, lines through the channels of the gaps
   * (`graph/grid.ts`); the other fields of `given` and the ranks of the edges are not read then.
   */
  readonly cells?: GraphCells;
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
