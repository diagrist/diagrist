import type { Point, Rect } from '@diagrist/core';
import { ACT } from '../layout/metrics.js';

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * A lightning bolt in the longest piece of an edge (UML 2.5.1, 15.6.4.2): slanted to one side, across back, slanted on.
 * The route stays rectangular, only the drawing bends. `early` puts it near the start, so the exception type at the
 * handler pin has room right of it.
 */
function bolt(points: readonly Point[], early: boolean): Point[] {
  const a = ACT.bolt;
  let [best, len] = [0, 0];
  for (let k = 0; k + 1 < points.length; k++) {
    const [p, q] = [points[k], points[k + 1]];
    const l = p && q ? Math.hypot(q[0] - p[0], q[1] - p[1]) : 0;
    if (l > len) [best, len] = [k, l];
  }
  const [p, q] = [points[best], points[best + 1]];
  if (len < 6 * a || !p || !q) return [...points];
  const d: Point = [(q[0] - p[0]) / len, (q[1] - p[1]) / len];
  const n: Point = [-d[1], d[0]];
  const m: Point = early ? [p[0] + d[0] * 3 * a, p[1] + d[1] * 3 * a] : [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const at = (s: number, t: number): Point => [round(m[0] + d[0] * s + n[0] * t), round(m[1] + d[1] * s + n[1] * t)];
  const zig = [at(-a, 0), at(0, a), at(0, -a), at(a, 0)];
  return [...points.slice(0, best + 1), ...zig, ...points.slice(best + 1)];
}

/** Path data of an edge; an interrupting edge gets its bolt, a handler's bolt near its start. */
export function edgePath(points: readonly Point[], interrupt: boolean, handler: boolean): string {
  const drawn = interrupt ? bolt(points, handler) : points;
  return drawn.map(([x, y], k) => `${k === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
}

/** A card with rounded corners as a path, as the lane heads of the card look are drawn. */
export function headPath(r: Rect, rx: number): string {
  const [x, y, w, b] = [r.x, r.y, r.w, r.y + r.h];
  return `M${x} ${y + rx} Q${x} ${y} ${x + rx} ${y} L${x + w - rx} ${y} Q${x + w} ${y} ${x + w} ${y + rx} L${x + w} ${b - rx} Q${x + w} ${b} ${x + w - rx} ${b} L${x + rx} ${b} Q${x} ${b} ${x} ${b - rx} Z`;
}
