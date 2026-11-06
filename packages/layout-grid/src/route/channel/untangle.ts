import type { Point } from '@diagrist/core';
import { type Side, segmentHitsRect, segmentsCross } from '../../geometry.js';
import type { Board } from '../boxes.js';
import type { Routed } from '../routed.js';

const flat = (side: Side): boolean => side === 'top' || side === 'bottom';

/** How often a route crosses the other routes. */
function crossings(points: readonly Point[], routes: readonly (readonly Point[])[]): number {
  let n = 0;
  for (const other of routes)
    for (let i = 1; i < points.length; i++)
      for (let k = 1; k < other.length; k++)
        if (segmentsCross(points[i - 1] as Point, points[i] as Point, other[k - 1] as Point, other[k] as Point)) n++;
  return n;
}

/** The route with its end at `end` moved along its side to `along`, the corner before it moving with it. */
function moved(r: Routed, end: 'from' | 'to', along: number): Routed | undefined {
  const points = end === 'from' ? [...r.points].reverse() : [...r.points];
  const side = end === 'from' ? r.fromSide : r.toSide;
  const k = flat(side) ? 0 : 1;
  const last = points.at(-1);
  const corner = points.at(-2);
  if (!last || !corner || points.length < 3 || corner[k] !== last[k]) return undefined;
  const shift = (p: Point): Point => (k === 0 ? [along, p[1]] : [p[0], along]);
  const next = [...points.slice(0, -2), shift(corner), shift(last)];
  return { ...r, points: end === 'from' ? next.reverse() : next };
}

/** Where a route ends on its box: the box and side of its start or end. */
const endOf = (r: Routed, end: 'from' | 'to'): string =>
  end === 'from' ? `${r.from.id}|${r.fromSide}` : `${r.to.id}|${r.toSide}`;

/**
 * Two bent routes that end on one side of a box and cross each other swap their places on that side when that
 * crosses fewer routes and runs through no node: the order of ends the port stage takes from where the other boxes
 * stand is wrong for lines that come round into the side from the gap beside it.
 */
export function untangle(routes: readonly Routed[], board: Board): Routed[] {
  const out = [...routes];
  const gap = board.tree.spec.metrics.laneGap;
  const through = (r: Routed) => {
    const own = new Set([r.from.id, r.to.id]);
    const rects = board.nodes.filter((n) => !own.has(n.id)).map((n) => n.rect);
    return r.points.slice(1).some((q, i) => rects.some((x) => segmentHitsRect(r.points[i] as Point, q, x, gap / 2)));
  };
  for (const end of ['from', 'to'] as const)
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) {
        const [a, b] = [out[i] as Routed, out[j] as Routed];
        if (endOf(a, end) !== endOf(b, end) || crossings(a.points, [b.points]) === 0) continue;
        const k = flat(end === 'from' ? a.fromSide : a.toSide) ? 0 : 1;
        const pa = (end === 'from' ? a.points[0] : a.points.at(-1)) as Point;
        const pb = (end === 'from' ? b.points[0] : b.points.at(-1)) as Point;
        const [a2, b2] = [moved(a, end, pb[k]), moved(b, end, pa[k])];
        if (!a2 || !b2 || through(a2) || through(b2)) continue;
        const rest = out.filter((_, n) => n !== i && n !== j).map((r) => r.points);
        const before = crossings(a.points, [...rest, b.points]) + crossings(b.points, rest);
        const after = crossings(a2.points, [...rest, b2.points]) + crossings(b2.points, rest);
        if (after >= before) continue;
        out[i] = a2;
        out[j] = b2;
      }
  return out;
}
