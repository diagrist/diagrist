import type { Side } from './geometry.js';

/**
 * A way through a channel grid: shape, sides, and the gaps a Z runs along by axis and number, the gaps between
 * tracks, or with `outer` the lanes beyond the first (`index` -1) and the last track. `via` is the second gap of a Z
 * that bends three times.
 */
export interface GridWay {
  readonly shape: 'straight' | 'L' | 'Z';
  readonly fromSide: Side;
  readonly toSide: Side;
  readonly lane?: GridGap;
  readonly via?: GridGap;
}

/** A gap of a channel grid by axis and number, as `GridWay` names it. */
export interface GridGap {
  readonly axis: 'col' | 'row';
  readonly index: number;
  readonly outer?: true;
}
