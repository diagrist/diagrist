/** The placed grid: columns, rows, nodes, frames and routes as the layout hands them to a kind. */
import type { Point, Rect } from '@diagrist/core';
import type { Side } from './geometry.js';
import type { GridWay } from './way.js';

/** A placed column: left edge and width. */
export interface Column {
  readonly name: string;
  readonly x: number;
  readonly w: number;
}

/** A placed row: top edge and height. */
export interface Row {
  readonly name: string;
  readonly y: number;
  readonly h: number;
}

/** A node in the picture; `col` and `row` are the indices of the cell it starts in. */
export interface PlacedNode {
  readonly id: string;
  readonly rect: Rect;
  readonly col: number;
  readonly row: number;
}

/** A placed frame (`GridGroup`): the rectangle around its member nodes and child frames. */
export interface PlacedGroup {
  readonly id: string;
  readonly rect: Rect;
}

/**
 * Where everything stands. Frames come parents first, the order to draw them in. `gutters` are the middles of the
 * gaps between neighbouring columns and rows, and its `margins` the lanes beyond the first and the last column and
 * row, outside every frame; `width` and `bottom` bound the grid with its margins.
 */
export interface GridLayout {
  readonly cols: readonly Column[];
  readonly rows: readonly Row[];
  readonly gutters: {
    readonly cols: readonly number[];
    readonly rows: readonly number[];
    readonly margins?: { readonly cols: readonly [number, number]; readonly rows: readonly [number, number] };
  };
  readonly nodes: readonly PlacedNode[];
  readonly groups: readonly PlacedGroup[];
  readonly width: number;
  readonly bottom: number;
}

/** `straight`, `L` and `Z` come from a fixed grid, `orthogonal` from the search of an adaptive one. */
export type RouteShape = 'straight' | 'L' | 'Z' | 'loop' | 'orthogonal';

/** The way of one edge, from its source to its target. */
export interface Route {
  /** Id of the edge. */
  readonly edge: string;
  readonly points: readonly Point[];
  readonly shape: RouteShape;
  readonly fromSide: Side;
  readonly toSide: Side;
  /** No way around the obstacles was found; the points are those of the fixed grid. */
  readonly unroutable?: boolean;
  /** The way a channel grid chose, for a later run of the grid to keep (`GridEdge.way`). */
  readonly way?: GridWay;
  /**
   * Where the pricing took a shorter way after its rounds: the way the rounds had chosen, none for the channel stage's
   * own, so a kind can judge the picture without the shorter ways.
   */
  readonly earlier?: { readonly way?: GridWay };
  /**
   * The tracks the route runs on in the gaps of a channel grid: the gap by axis and number, as `GutterRoom` counts
   * them, and where across it the track lies, so the gap can ask the room its whole row of tracks takes.
   */
  readonly tracks?: readonly Track[];
}

/** A track of a route in the gap `gap` between two columns (`col`) or rows (`row`), `at` across it. */
interface Track {
  readonly axis: 'col' | 'row';
  readonly gap: number;
  readonly at: number;
}
