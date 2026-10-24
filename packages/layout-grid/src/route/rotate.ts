import type { Point, Rect } from '@diagrist/core';
import type { Side } from '../geometry.js';

/** A turn and mirror that lays a side to the right, so trunks are computed for one direction and turned back. */
export interface Turn {
  readonly to: (p: Point) => Point;
  readonly from: (p: Point) => Point;
}

export function turnFor(side: Side): Turn {
  switch (side) {
    case 'right':
      return { to: (p) => p, from: (p) => p };
    case 'left':
      return { to: ([x, y]) => [-x, y], from: ([x, y]) => [-x, y] };
    case 'bottom':
      return { to: ([x, y]) => [y, x], from: ([x, y]) => [y, x] };
    case 'top':
      return { to: ([x, y]) => [-y, x], from: ([x, y]) => [y, -x] };
  }
}

export function mapRect(r: Rect, f: (p: Point) => Point): Rect {
  const [ax, ay] = f([r.x, r.y]);
  const [bx, by] = f([r.x + r.w, r.y + r.h]);
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
}
