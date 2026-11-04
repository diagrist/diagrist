import type { Rect } from '../geometry.js';

/** A side of a box, where a line leaves or enters it. */
export type Side = 'top' | 'bottom' | 'left' | 'right';

/** Horizontal middle of a rectangle. */
export const cx = (r: Rect): number => r.x + r.w / 2;

/** Rectangles overlap when they share more than an edge; `pad` grows both by that much. */
export function overlaps(a: Rect, b: Rect, pad = 0): boolean {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

/** The smallest rectangle around all of `rs`; callers pass at least one. */
export function union(rs: readonly Rect[]): Rect {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map((r) => r.x + r.w)) - x, h: Math.max(...rs.map((r) => r.y + r.h)) - y };
}
