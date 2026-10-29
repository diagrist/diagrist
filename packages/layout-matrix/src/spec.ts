import type { Rect } from '@diagrist/core';

/** A text block the caller has wrapped and measured: its widest line and how many lines it has. */
export interface Block {
  readonly width: number;
  readonly lines: number;
}

/** A head across the top, one per column of cells, in order from left to right. */
export interface TopHead {
  readonly key: string;
  readonly head: Block;
}

/**
 * An entry down the side, in order from top to bottom: a `line` of cells with its head at the left, or a `band`
 * across the whole width that heads the lines below it.
 */
export interface SideEntry {
  readonly kind: 'line' | 'band';
  readonly key: string;
  readonly head: Block;
}

/** Measures of the table in pixels, chosen by the caller's look. */
export interface TableMetrics {
  /** Height of one line of text in every head. */
  readonly lineHeight: number;
  /** The least width and height of a cell, also when its heads are smaller. */
  readonly cell: { readonly w: number; readonly h: number };
  /** Room between a head's text and the edges of its rectangle. */
  readonly pad: { readonly x: number; readonly y: number };
}

/** What to place: the top left corner, the heads across the top, the entries down the side, and the measures. */
export interface TableSpec {
  readonly x: number;
  readonly y: number;
  readonly top: readonly TopHead[];
  readonly side: readonly SideEntry[];
  readonly metrics: TableMetrics;
}

/** A head across the top with the rectangle it fills; its cells stand below it in the same width. */
export interface PlacedTop {
  readonly key: string;
  readonly rect: Rect;
}

/** An entry down the side: for a `line` the rectangle of its head, for a `band` the whole width of the table. */
export interface PlacedSide {
  readonly kind: 'line' | 'band';
  readonly key: string;
  readonly rect: Rect;
}

/** One cell where the column of a top head meets a line. */
export interface PlacedCell {
  readonly top: string;
  readonly line: string;
  readonly rect: Rect;
}

/** The placed table: heads, entries and cells, the rectangle of the cells, and the outer edge of everything. */
export interface TableLayout {
  readonly top: readonly PlacedTop[];
  readonly side: readonly PlacedSide[];
  readonly cells: readonly PlacedCell[];
  /** Where the cells are, below the top heads and right of the side heads. */
  readonly body: Rect;
  /** The whole table, heads included. */
  readonly frame: Rect;
}
