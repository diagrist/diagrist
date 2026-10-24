import type { Point } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import { endBox } from '../ends.js';
import { STATE as S } from '../metrics.js';
import { segmentHits } from '../points/geometry.js';
import { blocking, type RouteContext } from './context.js';

const OPPOSITE = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const;

/** Do two pieces lie on the same line and overlap? */
export function collinear(a: Point, b: Point, c: Point, d: Point): boolean {
  const flat = a[1] === b[1] && c[1] === d[1] && a[1] === c[1];
  const upright = a[0] === b[0] && c[0] === d[0] && a[0] === c[0];
  if (!flat && !upright) return false;
  const k = flat ? 0 : 1;
  return (
    Math.min(Math.max(a[k], b[k]), Math.max(c[k], d[k])) - Math.max(Math.min(a[k], b[k]), Math.min(c[k], d[k])) > 1
  );
}

/** Does a candidate touch a blocking rectangle or lie on another route? */
function clashes(points: readonly Point[], i: number, out: readonly Route[], c: RouteContext): boolean {
  if (blocking(c, i).some((r) => points.slice(1).some((p, k) => segmentHits(points[k] ?? p, p, r, 2)))) return true;
  return out.some(
    (o, j) =>
      j !== i &&
      o.points
        .slice(1)
        .some((q, k) => points.slice(1).some((p, n) => collinear(points[n] ?? p, p, o.points[k] ?? q, q))),
  );
}

/**
 * Steps in the middle: a transition with one offset (out, across, in) bends in the middle of the gap between source
 * and target, not close to the border. Up to `step` the offset becomes a straight line.
 */
export function centreSteps(routes: readonly Route[], c: RouteContext): Route[] {
  const out = [...routes];
  routes.forEach((r, i) => {
    if (r.points.length !== 4 || r.toSide !== OPPOSITE[r.fromSide]) return;
    const [p0, p1, p2, p3] = r.points as [Point, Point, Point, Point];
    const main = r.fromSide === 'top' || r.fromSide === 'bottom' ? 1 : 0;
    const cross = main === 1 ? 0 : 1;
    if (p0[cross] !== p1[cross] || p2[cross] !== p3[cross] || p1[main] !== p2[main]) return;
    const mid = Math.round((p0[main] + p3[main]) / 2);
    const set = (p: Point): Point => (main === 1 ? [p[0], mid] : [mid, p[1]]);
    const to = c.ends[i] ? endBox(c.ends[i].to, c.grid)?.rect : undefined;
    const [lo, hi] = to ? (main === 1 ? [to.x, to.x + to.w] : [to.y, to.y + to.h]) : [0, 0];
    const small = Math.abs(p0[cross] - p3[cross]) <= S.step && p0[cross] >= lo + S.step && p0[cross] <= hi - S.step;
    const end: Point = main === 1 ? [p0[0], p3[1]] : [p3[0], p0[1]];
    const points: Point[] = small ? [p0, end] : [p0, set(p1), set(p2), p3];
    if (!clashes(points, i, out, c)) out[i] = { ...r, points, ...(small ? { shape: 'straight' as const } : {}) };
  });
  return out;
}

const sign = (a: number, b: number) => Math.sign(b - a);

/** Stairs out, across, on, across in: two bends in the same direction that join into one corner. */
function stairs(p: readonly Point[]): Point | undefined {
  if (p.length !== 5) return undefined;
  const [p0, p1, p2, p3, p4] = p as [Point, Point, Point, Point, Point];
  const upright = p0[0] === p1[0] && p2[0] === p3[0] && p1[1] === p2[1] && p3[1] === p4[1];
  const flat = p0[1] === p1[1] && p2[1] === p3[1] && p1[0] === p2[0] && p3[0] === p4[0];
  if (upright && sign(p0[1], p1[1]) === sign(p2[1], p3[1]) && sign(p1[0], p2[0]) === sign(p3[0], p4[0]))
    return [p0[0], p4[1]];
  if (flat && sign(p0[0], p1[0]) === sign(p2[0], p3[0]) && sign(p1[1], p2[1]) === sign(p3[1], p4[1]))
    return [p4[0], p0[1]];
  return undefined;
}

/**
 * A transition entering its target sideways in two steps of the same direction becomes one corner: first all along
 * the flow, then across into the target.
 */
export function cornerSteps(routes: readonly Route[], c: RouteContext): Route[] {
  const out = [...routes];
  routes.forEach((r, i) => {
    const corner = stairs(r.points);
    const [first, last] = [r.points[0], r.points[4]];
    if (!corner || !first || !last) return;
    const points: Point[] = [first, corner, last];
    if (!clashes(points, i, out, c)) out[i] = { ...r, points, shape: 'orthogonal' };
  });
  return out;
}
