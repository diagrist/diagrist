import type { Rect } from '@diagrist/core';

/** Texts at one end of an edge: a `box` sits on the end across the line, a short `mark` beside or behind it. */
export interface EndText {
  readonly box?: string;
  readonly mark?: string;
}

/**
 * The texts of an edge as its kind phrases them. `name` goes above a horizontal line and `detail` below it; on bent
 * or vertical lines both join with ` · `. Vertical labels stand left of the line, right of it when `accent`.
 */
export interface EdgeText {
  readonly edge: string;
  readonly name?: string;
  readonly detail?: string;
  readonly accent?: boolean;
  readonly from?: EndText;
  readonly to?: EndText;
}

/**
 * A placed line of text: anchor point, anchor as in SVG, and the box it covers. `route` is the index of its route;
 * `part` says which text it is, so the kind can style it. An end `box` also carries the frame drawn around it,
 * `turn` when its text runs vertically.
 */
export interface EdgeLabel {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
  readonly box: Rect;
  readonly route: number;
  readonly part: 'name' | 'detail' | 'box' | 'mark';
  readonly frame?: { readonly rect: Rect; readonly turn: boolean };
}
