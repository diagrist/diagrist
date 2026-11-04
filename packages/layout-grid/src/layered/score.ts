import type { Point } from '@diagrist/core';
import { segmentsIntersect } from '../label/segment.js';
import type { Route } from '../layout.js';

/** How many points two lines of different edges share or cross at, trunks shared by both left out. */
function crossings(a: readonly Point[], b: readonly Point[]): number {
  let n = 0;
  for (let i = 1; i < a.length; i++)
    for (let k = 1; k < b.length; k++)
      if (segmentsIntersect(a[i - 1] as Point, a[i] as Point, b[k - 1] as Point, b[k] as Point)) n++;
  return n;
}

const length = (points: readonly Point[]) =>
  points
    .slice(1)
    .reduce((s, p, i) => s + Math.abs(p[0] - (points[i]?.[0] ?? 0)) + Math.abs(p[1] - (points[i]?.[1] ?? 0)), 0);

/**
 * What a laid out picture costs, lower being better: every crossing of two lines that share no trunk far more than
 * anything else, then every bend, then the length of all lines and the width of the picture.
 */
export function costOf(routes: readonly Route[], trunks: ReadonlyMap<string, string>, width: number): number {
  let total = 0;
  for (const [i, a] of routes.entries())
    for (const b of routes.slice(i + 1)) {
      const shared = trunks.get(a.edge) !== undefined && trunks.get(a.edge) === trunks.get(b.edge);
      if (!shared) total += 1000 * crossings(a.points, b.points);
    }
  for (const r of routes) total += 20 * Math.max(0, r.points.length - 2) + length(r.points) / 10;
  return total + width / 10;
}
