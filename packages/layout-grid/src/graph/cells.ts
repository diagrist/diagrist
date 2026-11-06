import type { Placed } from '@diagrist/core';
import type { OnLine } from '../label/on-line.js';
import type { EdgeLabel, EdgeText } from '../label/types.js';
import type { GridLayout, Route } from '../layout.js';
import type { GridColumn, GridMetrics, GridNode, GridRow } from '../spec.js';
import type { GraphGiven, LayoutGraph } from './spec.js';

/**
 * The place of a node in the author's grid: its column and row, the last ones of the area it covers, its share of
 * that area, and what it brings of its own. Without `width` or `height` the node fills its place; the node's own
 * `width` is the least it asks of its columns in an adaptive grid, `exact` letting a column of only such nodes be
 * narrower than the grid's node width, and its `height` the least it asks of its row. An `ellipse` with a `width` of
 * its place is a circle of that diameter in the middle of its place.
 */
export interface GraphCell
  extends Pick<GridNode, 'col' | 'row' | 'to' | 'slot' | 'width' | 'height' | 'caption' | 'reserve'> {
  readonly node: string;
  readonly exact?: boolean;
}

/**
 * What a frame of a grid needs besides its `GraphContainer`: the room at its left and right (its `pad` is the room
 * below, its `top` the room above), a column it reaches over too, where its head stands from its top left corner or,
 * with `origin: 'middle'`, from the middle of its top edge (its `head` gives the size), and where it comes from, for
 * the placement check.
 */
export interface GraphFrameCell {
  readonly frame: string;
  readonly left: number;
  readonly right: number;
  readonly cover?: string;
  readonly head?: { readonly x: number; readonly y: number; readonly origin?: 'middle' };
  readonly source?: Placed['span'];
}

/**
 * Signs on and beside the lines of a grid, each `w` by `h`. `numbers` stand on the lines of `edges`, `offset` past the
 * start of their longest piece first, and keep `room` from the texts; `pins` stand beside the lines of `edges` near
 * their head; `corners` stand beside a corner of their node, or with `inside` that far left of its right edge and
 * below its top. Texts and signs keep clear of each other, of boxes, heads, foreign frames and foreign lines.
 */
export interface GraphSigns {
  readonly numbers?: {
    readonly w: number;
    readonly h: number;
    readonly room: number;
    readonly offset: number;
    readonly edges: readonly string[];
  };
  readonly pins?: { readonly w: number; readonly h: number; readonly edges: readonly string[] };
  readonly corners?: {
    readonly w: number;
    readonly h: number;
    readonly at: readonly { readonly node: string; readonly inside?: { readonly dx: number; readonly dy: number } }[];
  };
}

/** The measures of a grid that the measures of the graph do not give. */
export type CellMetrics = Omit<
  GridMetrics,
  'colGap' | 'rowGap' | 'laneGap' | 'portSpread' | 'lead' | 'labelGap' | 'marginX' | 'firstRowY'
>;

/**
 * The author's grid of a picture (ADR 0039, amendment of 06.11.2026): its columns and rows, the cell of every node,
 * the frames' sides and heads, the columns edges keep to, and the texts and signs of the lines. With it the stages
 * place nothing themselves: the grid places, `adaptive` growing columns and gaps to the content, and the channel
 * stage of ADR 0038 sets ports, tracks, texts and signs, the gaps widening where they do not fit. The graph's
 * measures give the gaps (`colGap`, `rowGapMin`), tracks, port gap, lead, label gap and the top left corner; `tail`
 * is not read. Edges are not ranked: the cells decide where their ends stand.
 */
export interface GraphCells {
  readonly cols: readonly GridColumn[];
  readonly rows: readonly GridRow[];
  readonly cells: readonly GraphCell[];
  readonly frames?: readonly GraphFrameCell[];
  /** A column an edge runs in: its vertical ends attach in the column's middle. */
  readonly lanes?: readonly { readonly edge: string; readonly col: string }[];
  readonly adaptive: boolean;
  readonly metrics: CellMetrics;
  readonly texts: readonly EdgeText[];
  readonly preferFlat?: boolean;
  readonly onLine?: OnLine;
  readonly signs?: GraphSigns;
}

/** A layout graph placed in the author's grid. */
export type CellGraph = LayoutGraph & { readonly given: GraphGiven & { readonly cells: GraphCells } };

/** A sign as placed, centred on (x, y), with the edge and the index of the route it belongs to. */
export interface PlacedSign {
  readonly edge: string;
  readonly route: number;
  readonly x: number;
  readonly y: number;
}

/**
 * A layout graph laid out in its grid: the grid with frames grown around routes and texts where it is adaptive, the
 * routes, texts, numbers, pins in the order of their routes, corners of the nodes placed in the order given, and what the
 * placement check reads of them (texts, numbers and pins keyed `<edge>.label.<n>`, `<edge>.number`, `<edge>.mark`).
 */
export interface CellLayout {
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly numbers: readonly PlacedSign[];
  readonly pins: readonly PlacedSign[];
  readonly corners: readonly { readonly node: string; readonly x: number; readonly y: number }[];
  readonly placed: readonly Placed[];
}
