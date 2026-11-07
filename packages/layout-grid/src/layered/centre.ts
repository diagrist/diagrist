import type { Rect } from '@diagrist/core';
import type { Group, Link } from './links.js';

/** How far from the middle of its side an end may stand to keep its line straight: a quarter of the box. */
const slipOf = (r: Rect) => r.w / 4;

/**
 * Ends that stand off the middle of their side for no straight line, moved to the middle (owner decision D5): an end
 * alone on its side whose piece comes from a placeholder, a line passing a layer, follows it no further than the
 * slip of its box, and an end of a piece between two boxes that bends anyway takes the middle whatever the slip. The
 * piece then jogs in the gap, which costs a bend but no corner port; a straight piece between two boxes keeps its
 * ends, since a jog there would be an avoidable bend.
 */
export function centreEnds(
  groups: readonly Group[],
  top: Map<Link, number>,
  bottom: Map<Link, number>,
  rects: ReadonlyMap<string, Rect>,
  alone: (box: string, side: 'top' | 'bottom') => boolean,
  placeholder: (id: string) => boolean,
): void {
  const centre = (box: string, side: 'top' | 'bottom', l: Link) => {
    const r = rects.get(box);
    const at = side === 'top' ? top : bottom;
    const v = at.get(l);
    if (r === undefined || v === undefined || !alone(box, side)) return;
    const mid = Math.round(r.x + r.w / 2);
    if (Math.abs(v - mid) > slipOf(r)) at.set(l, mid);
  };
  for (const g of groups) {
    if (g.kind !== 'single') continue;
    const l = g.links[0] as Link;
    const [up, low] = [placeholder(l.upper), placeholder(l.lower)];
    if (up && !low) centre(l.lower, 'top', l);
    if (low && !up) centre(l.upper, 'bottom', l);
  }
}
