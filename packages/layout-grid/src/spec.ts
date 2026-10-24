import type { Font, Placed, Point, Rect } from '@diagrist/core';
import type { Side } from './geometry.js';

/** Room between the line of a frame and what it holds, per side. */
export interface Pads {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/**
 * The measures a kind lays out with, in pixels. They come from the kind's style table; the grid knows no kind
 * and no look, so everything that differs between kinds arrives here or on the nodes.
 */
export interface GridMetrics {
  /** Snapping unit: reserves for frame heads round up to it. */
  readonly grid: number;
  /** Width of a column without a width of its own, and the least a growing node asks of its columns. */
  readonly nodeW: number;
  /** Least height of a row, and the height of a node that says nothing else. */
  readonly nodeH: number;
  /** Least height of a row instead of `nodeH`, for kinds whose small symbols take rows of their own. */
  readonly rowMin?: number;
  /** Gap between columns, and between columns whose names share the prefix before a dot (`api.1`, `api.2`). */
  readonly colGap: number;
  readonly subColGap: number;
  /** Gap between rows of a fixed grid, and the base gap of straight-line diagrams. */
  readonly rowGap: number;
  /** Left and right margin of the grid, and the top of the first row. */
  readonly marginX: number;
  readonly firstRowY: number;
  /** Margin below the content, for the bottom when frames fit around routes. */
  readonly margin: number;
  /** Distance between parallel lines in one gap, also the clearance the router keeps around obstacles. */
  readonly laneGap: number;
  /** Distance between neighbouring ends of bent edges on one side of a node in a fixed grid. */
  readonly portSpread: number;
  /** How far a loop reaches out right of and below its node. */
  readonly loopReach: number;
  /**
   * The usual pads of a frame. `top` is also the head strip edges must not run through, `x` and `bottom` the room
   * frames keep when they grow around routes.
   */
  readonly framePad: { readonly top: number; readonly bottom: number; readonly x: number };
  /** Font of edge labels, their line height and the distance between label and line. */
  readonly labelFont: Font;
  readonly labelLineH: number;
  readonly labelGap: number;
  /** Straight lines stop this far outside a box. */
  readonly endGap?: number;
  /** Extra gap below every row of an adaptive grid, for parts sticking out of nodes such as icons on cards. */
  readonly rowOverhang?: number;
}

/** A column of the grid; without a width it is `nodeW` wide. */
export interface GridColumn {
  readonly name: string;
  readonly width?: number;
}

/** A row of the grid; `gap` is the least gap below it, for kinds that need more room than the grid gives. */
export interface GridRow {
  readonly name: string;
  readonly gap?: number;
}

/**
 * A node with the measures its kind has already taken. Without own width or height it fills its place; with them
 * it stands in the middle of it.
 */
export interface GridNode {
  readonly id: string;
  readonly col: string;
  readonly row: string;
  /** Last column and last row of the area the node covers. */
  readonly to?: { readonly col?: string; readonly row?: string };
  /** The node takes place `index` of `count` equal places in its area, side by side or, across rows, stacked. */
  readonly slot?: { readonly index: number; readonly count: number };
  /** Own width; for a circle its diameter. */
  readonly width?: number;
  /** Own height; a smaller node stands vertically in the middle of its row. */
  readonly height?: number;
  /** Height the node asks of its row; without it its own height, else `nodeH`. A tall node reaching over rows asks less. */
  readonly rowHeight?: number;
  /**
   * Width the node asks of its columns in an adaptive grid. `exact` lets a column of only such nodes be narrower than
   * `nodeW`. Without it a node with own width asks exactly that, others `nodeW`.
   */
  readonly demand?: { readonly width: number; readonly exact: boolean };
  /**
   * Outline for routes and labels: a box, an ellipse in its rectangle, or a circle of diameter `width` in the middle of
   * its place. Lines end on the outline.
   */
  readonly shape?: 'box' | 'ellipse' | 'circle';
  /** A text hanging below the node, as wide as `w` and `below` deep: frames enclose it, labels keep off it. */
  readonly caption?: { readonly w: number; readonly below: number };
  /** Radius of a circle on the middle of the top edge, such as the icon of a card; edges keep clear of it. */
  readonly crest?: number;
  /** Where the node comes from, handed on to the kernel's placement check. */
  readonly source?: Placed['span'];
}

/** A frame around its member nodes and child frames. Its kind measured the pads and the head. */
export interface GridGroup {
  readonly id: string;
  readonly parent?: string;
  /** Ids of the nodes directly in the frame, in the order the kind declares them. */
  readonly members: readonly string[];
  readonly pads: Pads;
  /** The frame is at least this wide, so its head fits. */
  readonly minWidth?: number;
  /** A column the frame also reaches over, at the height of its members. */
  readonly cover?: string;
  readonly source?: Placed['span'];
}

/** A connection between two nodes or frames (ids of either). */
export interface GridEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  /** Edges with the same bundle and a shared end share one trunk in an adaptive grid. */
  readonly bundle?: string;
  /** A column the edge runs in: vertical edges attach in its middle and reach into frames at their ends. */
  readonly lane?: string;
  /** How far a loop reaches out; default `loopReach`. */
  readonly loopReach?: number;
  /**
   * Sides the kind chooses in an adaptive grid, one pair per attempt: the three ways round of a long edge with the
   * edges in their order, then the same three with the edges in reverse order. Without them the grid chooses. A kind
   * docks back edges on rails beside both of their nodes this way.
   */
  readonly sides?: readonly (readonly [Side, Side])[];
  /** Rectangles an adaptive route keeps out of besides the nodes, such as frames that hold neither end. */
  readonly avoid?: readonly Rect[];
  /**
   * A route the kind laid itself, such as a loop at the freest corner of a node. The grid takes it as it is, and in
   * an adaptive grid other edges route around it and keep the parts of the sides it touches free.
   */
  readonly route?: { readonly points: readonly Point[]; readonly fromSide: Side; readonly toSide: Side };
  readonly source?: Placed['span'];
}

/**
 * Everything the grid places. `adaptive` grows columns and gaps to the content and routes around obstacles; a fixed
 * grid keeps its measures and routes straight, L or Z shaped. With `lines: 'straight'` edges run directly from
 * outline to outline, and rows need no corridors.
 */
export interface GridSpec {
  readonly cols: readonly GridColumn[];
  readonly rows: readonly GridRow[];
  readonly nodes: readonly GridNode[];
  readonly groups: readonly GridGroup[];
  readonly edges: readonly GridEdge[];
  readonly metrics: GridMetrics;
  readonly adaptive: boolean;
  readonly lines?: 'orthogonal' | 'straight';
}
