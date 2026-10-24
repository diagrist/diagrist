/** An axis-aligned rectangle in picture coordinates; `x` and `y` are its top left corner. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A point as `[x, y]`, the way polylines and anchors list them. */
export type Point = readonly [number, number];
