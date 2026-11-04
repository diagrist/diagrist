import type { Point, Rect } from '@diagrist/core';
import { type GridLayout, type Route, segmentMeetsRect, segmentsIntersect } from '@diagrist/layout-grid';
import { CLASS, tabWidth } from './metrics.js';

/** Step of the search for a free vertical, and the least distance from a parallel line or a tab. */
const STEP = 8;
const AIR = 12;
/** Ends keep this far from the corners of a frame. */
const INSET = 16;

/** What a line with a package at an end keeps clear of: the other lines, the boxes and the names set so far. */
export interface Others {
  readonly routes: readonly Route[];
  readonly grid: GridLayout;
  readonly texts: readonly Rect[];
}

/** Does a vertical piece at `x` from `y1` to `y2` cross a line, run close beside one, or touch a box or a name? */
function blocked(x: number, y1: number, y2: number, { routes: others, grid, texts }: Others): boolean {
  const [lo, hi] = [Math.min(y1, y2), Math.max(y1, y2)];
  const p: Point = [x, y1];
  const q: Point = [x, y2];
  return (
    grid.nodes.some((n) => segmentMeetsRect(p, q, n.rect, AIR / 2)) ||
    texts.some((t) => segmentMeetsRect(p, q, t, AIR)) ||
    others.some((o) =>
      o.points.slice(1).some((v, k) => {
        const u = o.points[k] ?? v;
        if (segmentsIntersect(p, q, u, v)) return true;
        return u[0] === v[0] && Math.abs(u[0] - x) < AIR && Math.max(u[1], v[1]) > lo && Math.min(u[1], v[1]) < hi;
      }),
    )
  );
}

/** Candidates from the middle of `[lo, hi]` outwards, `STEP` apart. */
function outwards(lo: number, hi: number): number[] {
  const mid = Math.round((lo + hi) / 2 / STEP) * STEP;
  const out: number[] = [];
  for (let k = 0; mid - k * STEP >= lo || mid + k * STEP <= hi; k++)
    for (const x of k === 0 ? [mid] : [mid + k * STEP, mid - k * STEP]) if (x >= lo && x <= hi) out.push(x);
  return out;
}

const route = (edge: string, points: Point[]): Route => {
  const [a, b] = [points[0] as Point, points[1] as Point];
  const [y, z] = [points.at(-2) as Point, points.at(-1) as Point];
  const side = (p: Point, q: Point) =>
    q[1] > p[1] ? 'bottom' : q[1] < p[1] ? 'top' : q[0] > p[0] ? 'right' : ('left' as const);
  const into = (p: Point, q: Point) =>
    q[1] > p[1] ? 'top' : q[1] < p[1] ? 'bottom' : q[0] > p[0] ? 'left' : ('right' as const);
  return { edge, points, shape: 'orthogonal', fromSide: side(a, b), toSide: into(y, z) };
};

/**
 * The line of a dependency with a package at an end, `a` and `b` being the rectangles of its ends and `tab` the name
 * of the target package: straight down or up where both share a stretch, on the first vertical from the middle of
 * that stretch that crosses no other line, keeps off the others, the names and the tab, or else off all but the
 * names, which then move aside, into the body below the tab; a Z
 * through the middle of the gap where they share none; a straight line across between ends side by side.
 */
export function packageLine(edge: string, a: Rect, b: Rect, tab: string | undefined, others: Others): Route {
  const below = a.y + a.h <= b.y;
  const above = b.y + b.h <= a.y;
  if (!below && !above) {
    const y = Math.round((Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2);
    return route(
      edge,
      a.x < b.x
        ? [
            [a.x + a.w, y],
            [b.x, y],
          ]
        : [
            [a.x, y],
            [b.x + b.w, y],
          ],
    );
  }
  const y1 = below ? a.y + a.h : a.y;
  const y2 = below ? b.y + (tab === undefined ? 0 : CLASS.tabH) : b.y + b.h;
  const clearOfTab = below && tab !== undefined ? b.x + Math.min(b.w, tabWidth(tab)) + AIR : Number.NEGATIVE_INFINITY;
  const lo = Math.max(a.x + INSET, b.x + INSET, clearOfTab);
  const hi = Math.min(a.x + a.w, b.x + b.w) - INSET;
  if (lo <= hi) {
    const xs = outwards(lo, hi);
    const loose = { ...others, texts: [] };
    const x = xs.find((v) => !blocked(v, y1, y2, others)) ?? xs.find((v) => !blocked(v, y1, y2, loose)) ?? xs[0] ?? lo;
    return route(edge, [
      [x, y1],
      [x, y2],
    ]);
  }
  const x1 = Math.round(a.x + a.w / 2);
  const x2 = Math.round(Math.max(b.x + b.w / 2, clearOfTab));
  const ym = Math.round((below ? a.y + a.h + b.y : b.y + b.h + a.y) / 2);
  return route(edge, [
    [x1, y1],
    [x1, ym],
    [x2, ym],
    [x2, y2],
  ]);
}
