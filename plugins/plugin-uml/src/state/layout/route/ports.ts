import type { Point } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import { endBox } from '../ends.js';
import type { RouteContext } from './context.js';

/** A staggered rail: index of the route and rank from inside (0) outward. */
export interface RankedRail {
  readonly index: number;
  readonly rank: number;
  readonly flat: boolean;
}

interface End {
  readonly rail: RankedRail;
  readonly start: boolean;
  /** +1 when the rail runs from here towards larger coordinates. */
  readonly inward: number;
  readonly at: number;
}

/**
 * Orders the docks of rails on one side of a node so their stubs do not cross the inner rails: rails running up dock
 * above, outer ones lower; rails running down below, outer ones higher. Horizontal rails alike.
 */
export function orderRailPorts(routes: readonly Route[], rails: readonly RankedRail[], c: RouteContext): Route[] {
  const out = [...routes];
  const ends = new Map<string, End[]>();
  for (const rail of rails) {
    const r = out[rail.index];
    const e = c.ends[rail.index];
    if (!r || !e) continue;
    const q = rail.flat ? 0 : 1;
    const first = r.points[0]?.[q] ?? 0;
    const last = r.points.at(-1)?.[q] ?? 0;
    const add = (node: string | undefined, start: boolean, at: number, other: number) => {
      const key = `${node}:${start ? r.fromSide : r.toSide}`;
      ends.set(key, [...(ends.get(key) ?? []), { rail, start, at, inward: Math.sign(other - at) }]);
    };
    add(endBox(e.from, c.grid)?.id, true, first, last);
    add(endBox(e.to, c.grid)?.id, false, last, first);
  }
  for (const list of ends.values()) {
    if (list.length < 2) continue;
    const slots = list.map((e) => e.at).sort((a, b) => a - b);
    const ordered = [...list].sort(
      (a, b) => a.inward - b.inward || (a.inward < 0 ? a.rail.rank - b.rail.rank : b.rail.rank - a.rail.rank),
    );
    ordered.forEach((e, i) => {
      const r = out[e.rail.index];
      const slot = slots[i];
      if (!r || slot === undefined) return;
      const q = e.rail.flat ? 0 : 1;
      const points = r.points.map((p) => [p[0], p[1]] as [number, number]);
      const [p, s] = e.start ? [0, 1] : [points.length - 1, points.length - 2];
      for (const k of [p, s]) {
        const point = points[k];
        if (point) point[q] = slot;
      }
      out[e.rail.index] = { ...r, points: points as Point[] };
    });
  }
  return out;
}
