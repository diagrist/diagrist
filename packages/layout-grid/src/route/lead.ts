import type { Point } from '@diagrist/core';
import { segmentHitsRect } from '../geometry.js';
import type { Board } from './boxes.js';
import type { Routed } from './routed.js';

const len = (a: Point, b: Point): number => Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
const axis = (a: Point, b: Point): 'h' | 'v' => (a[1] === b[1] ? 'h' : 'v');

/**
 * Routes of an adaptive grid whose last straight run into the head is shorter than `lead` move their last bend back
 * by what is missing: the piece across shifts away from the head and the run before it gets shorter. That needs a
 * run before it in the same direction, which keeps at least `lead` itself, and the shifted piece must stay `gap / 2`
 * clear of every node but the ends and `gap` apart from the pieces of other routes; else the route stays.
 */
export function withLead(routes: readonly Routed[], board: Board, lead: number, gap: number): Routed[] {
  const out = [...routes];
  for (const [i, r] of routes.entries()) {
    const p = r.points;
    const n = p.length;
    if (n < 4 || r.shape === 'loop') continue;
    const [a, b, c, end] = [p[n - 4], p[n - 3], p[n - 2], p[n - 1]] as [Point, Point, Point, Point];
    const missing = lead - len(c, end);
    if (missing <= 0 || axis(a, b) !== axis(c, end) || axis(b, c) === axis(c, end)) continue;
    const dir: Point = [Math.sign(end[0] - c[0]), Math.sign(end[1] - c[1])];
    if (Math.sign(b[0] - a[0]) !== dir[0] || Math.sign(b[1] - a[1]) !== dir[1] || len(a, b) - missing < lead) continue;
    const back = (q: Point): Point => [q[0] - dir[0] * missing, q[1] - dir[1] * missing];
    const [b2, c2] = [back(b), back(c)];
    const own = new Set([r.from.id, r.to.id]);
    const hits = board.nodes.some((node) => !own.has(node.id) && segmentHitsRect(b2, c2, node.rect, gap / 2));
    const crowds = out.some(
      (o, k) =>
        k !== i &&
        o.points.slice(1).some((q, j) => {
          const s = o.points[j] as Point;
          return (
            axis(s, q) === axis(b2, c2) &&
            segmentHitsRect(
              s,
              q,
              {
                x: Math.min(b2[0], c2[0]),
                y: Math.min(b2[1], c2[1]),
                w: Math.abs(c2[0] - b2[0]),
                h: Math.abs(c2[1] - b2[1]),
              },
              gap - 1,
            )
          );
        }),
    );
    if (hits || crowds) continue;
    out[i] = { ...r, points: [...p.slice(0, n - 3), b2, c2, end] };
  }
  return out;
}
