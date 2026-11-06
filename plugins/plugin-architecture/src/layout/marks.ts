import type { Rect } from '@diagrist/core';
import type { LookOptions } from '../looks/look.js';

/** A flow number on its edge, centred on (x, y). */
export interface Badge {
  readonly n: number;
  readonly route: number;
  readonly x: number;
  readonly y: number;
  readonly accent: boolean;
}

/** A decision mark at an edge (`route`) or at the corner of a node. */
export interface Mark {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly route?: number;
}

/** The size of a flow number by `numbers.form`: `(3)` on a rounded plate, or the digit in a disc. */
export const NUMBER_SIZE: Readonly<Record<LookOptions['numbers']['form'], { readonly w: number; readonly h: number }>> =
  { plate: { w: 24, h: 16 }, disc: { w: 15, h: 15 } };

/** How far the gap behind texts on a line reaches beyond them to the sides and up and down (`ground: gap`). */
export const TEXT_GAP = { x: 4, y: 2 } as const;

/** The size of a decision mark, which `markShapes` of `parts` draws centred on its spot. */
const MARK_SIZE = { w: 24, h: 14 } as const;

/** The size of a decision mark. */
export const MARK = MARK_SIZE;

/** The rectangle a decision mark takes, for what keeps clear of it. */
export const markRect = (k: Mark): Rect => ({
  x: k.x - MARK_SIZE.w / 2,
  y: k.y - MARK_SIZE.h / 2,
  ...MARK_SIZE,
});
