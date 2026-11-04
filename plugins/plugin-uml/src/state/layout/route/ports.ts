import type { Point, Rect } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import { type EndBox, endBox } from '../ends.js';
import { STATE as S } from '../metrics.js';
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
 * Docks of one side at least `laneGap` apart (plan Q8): where two come closer, all of them stand evenly around
 * their middle, kept off the corners of the side.
 */
function spread(slots: readonly number[], rect: Rect | undefined, flat: boolean): number[] {
  if (slots.slice(1).every((v, i) => v - (slots[i] ?? v) >= S.laneGap) || !rect) return [...slots];
  const [lo, hi] = flat ? [rect.x, rect.x + rect.w] : [rect.y, rect.y + rect.h];
  const span = (slots.length - 1) * S.laneGap;
  const mid = slots.reduce((a, b) => a + b, 0) / slots.length;
  const start = Math.max(lo + S.laneGap / 2, Math.min(hi - S.laneGap / 2 - span, mid - span / 2));
  return slots.map((_, i) => Math.round(start + i * S.laneGap));
}

/**
 * Orders the docks of rails on one side of a node so their stubs do not cross the inner rails: rails running up dock
 * above, outer ones lower; rails running down below, outer ones higher. Horizontal rails alike. Docks closer than
 * `laneGap` spread out.
 */
export function orderRailPorts(routes: readonly Route[], rails: readonly RankedRail[], c: RouteContext): Route[] {
  const out = [...routes];
  const ends = new Map<string, End[]>();
  const rects = new Map<string, Rect>();
  for (const rail of rails) {
    const r = out[rail.index];
    const e = c.ends[rail.index];
    if (!r || !e) continue;
    const q = rail.flat ? 0 : 1;
    const first = r.points[0]?.[q] ?? 0;
    const last = r.points.at(-1)?.[q] ?? 0;
    const add = (node: EndBox | undefined, start: boolean, at: number, other: number) => {
      const key = `${node?.id}:${start ? r.fromSide : r.toSide}`;
      if (node) rects.set(key, node.rect);
      ends.set(key, [...(ends.get(key) ?? []), { rail, start, at, inward: Math.sign(other - at) }]);
    };
    add(endBox(e.from, c.grid), true, first, last);
    add(endBox(e.to, c.grid), false, last, first);
  }
  for (const [key, list] of ends) {
    if (list.length < 2) continue;
    const flat = list[0]?.rail.flat ?? false;
    const slots = spread(
      list.map((e) => e.at).sort((a, b) => a - b),
      rects.get(key),
      flat,
    );
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
