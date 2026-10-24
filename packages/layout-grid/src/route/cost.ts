import type { Point } from '@diagrist/core';

/** Penalty of a path segment a-b against routes already laid: crossing one, or running on one. */
export function interference(a: Point, b: Point, used: readonly (readonly Point[])[]): number {
  let cost = 0;
  for (const route of used)
    for (let i = 1; i < route.length; i++) {
      const c = route[i - 1] as Point;
      const d = route[i] as Point;
      const crossing =
        a[1] === b[1]
          ? c[0] === d[0] &&
            c[0] >= Math.min(a[0], b[0]) &&
            c[0] <= Math.max(a[0], b[0]) &&
            a[1] > Math.min(c[1], d[1]) &&
            a[1] < Math.max(c[1], d[1])
          : c[1] === d[1] &&
            c[1] >= Math.min(a[1], b[1]) &&
            c[1] <= Math.max(a[1], b[1]) &&
            a[0] > Math.min(c[0], d[0]) &&
            a[0] < Math.max(c[0], d[0]);
      if (crossing) cost += 10000;
      const h = a[1] === b[1];
      if (h !== (c[1] === d[1]) || a[h ? 1 : 0] !== c[h ? 1 : 0]) continue;
      const k = h ? 0 : 1;
      const overlap =
        Math.min(Math.max(a[k], b[k]), Math.max(c[k], d[k])) - Math.max(Math.min(a[k], b[k]), Math.min(c[k], d[k]));
      if (overlap > 0) cost += 10000 + overlap * 20;
    }
  return cost;
}
