/**
 * The placed grid: columns, rows, nodes, frames and routes as the layout hands them to a kind.
 *
 * Layout code keeps the predecessor's order of floating point steps. A value computed once is passed on, not computed
 * again from its parts (the right edge stays as it was summed, not `x + w`), and sums are not regrouped or reordered,
 * because floating point addition is not associative and the golden pictures compare bytes. A refactor here, or in a
 * kind's layout, must keep every number as it was; the hash files of the examples show at once when it does not.
 */
import type { Point, Rect } from '@diagrist/core';
import type { Side } from './geometry.js';

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
 * gaps between neighbouring columns and rows; `width` and `bottom` bound the grid with its margins.
 */
export interface GridLayout {
  readonly cols: readonly Column[];
  readonly rows: readonly Row[];
  readonly gutters: { readonly cols: readonly number[]; readonly rows: readonly number[] };
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
}
