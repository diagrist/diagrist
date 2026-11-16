import type { Font, Rect } from '@diagrist/core';

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
  /**
   * Where along its line the text belongs: by default the spot search looks from the middle of the longest piece;
   * `start` looks along the pieces in the line's order, each from its start, as for a guard or a trigger.
   */
  readonly at?: 'start' | 'middle';
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

/** How the detail line of an edge is measured and joined, where a kind sets it apart from the name. */
export interface DetailLine {
  /** Its font, such as a protocol in a smaller face; `labelFont` when left out. */
  readonly font?: Font;
  /** Room it keeps left and right of its text, as for a frame drawn around it. */
  readonly pad?: number;
  /** What joins it to the name where both share a line, as beside a bent or upright line; ` · ` when left out. */
  readonly join?: string;
}
