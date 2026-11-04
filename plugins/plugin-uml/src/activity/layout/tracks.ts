import type { Point } from '@diagrist/core';
import { assignTracks, gapHeight, type TrackPiece } from '@diagrist/layout-grid';
import { ACT } from './metrics.js';
import type { Placement } from './place.js';
import type { Routed } from './route.js';

/** A horizontal piece that hangs on no node: its route and the index of its first point there. */
interface Jog {
  readonly route: number;
  readonly at: number;
}

/** Pieces of one gap that share a track: a branch or a confluence that meets in one point is one piece. */
interface Shared extends TrackPiece {
  readonly jogs: readonly Jog[];
}

/** A gap between layers holds its tracks with a run of half a layer gap above the first and below the last. */
const MEASURE = { first: ACT.layerGap / 2, track: ACT.track, last: ACT.layerGap / 2, min: ACT.layerGap };

/** The piece of a jog: where the verticals at its ends come from above and where they go down. */
function pieceOf(points: readonly Point[], jog: Jog): Shared {
  const [before, a, b, after] = [-1, 0, 1, 2].map((k) => points[jog.at + k] as Point) as [Point, Point, Point, Point];
  const ends: [number, boolean][] = [
    [a[0], before[1] < a[1]],
    [b[0], after[1] < b[1]],
  ];
  return {
    jogs: [jog],
    tops: ends.filter((e) => e[1]).map((e) => e[0]),
    bottoms: ends.filter((e) => !e[1]).map((e) => e[0]),
    x1: Math.min(a[0], b[0]),
    x2: Math.max(a[0], b[0]),
    track: 0,
  };
}

/** Two pieces that touch in one point only, where both hang on the same vertical, become one. */
function join(pieces: readonly Shared[]): Shared[] {
  const out: Shared[] = [];
  for (const p of pieces) {
    const k = out.findIndex(
      (q) =>
        Math.min(p.x2, q.x2) - Math.max(p.x1, q.x1) <= 1 &&
        (p.tops.some((t) => q.tops.includes(t)) || p.bottoms.some((u) => q.bottoms.includes(u))),
    );
    const q = out[k];
    if (q === undefined) out.push(p);
    else
      out[k] = {
        jogs: [...q.jogs, ...p.jogs],
        tops: [...new Set([...q.tops, ...p.tops])],
        bottoms: [...new Set([...q.bottoms, ...p.bottoms])],
        x1: Math.min(q.x1, p.x1),
        x2: Math.max(q.x2, p.x2),
        track: 0,
      };
  }
  return out;
}

/** The jogs of all routes by the gap they stand in, as the index of the layer below; outside the rows by height. */
function jogsByGap(routes: readonly Routed[], pl: Placement): Map<string, Jog[]> {
  const gapOf = (y: number) => {
    const below = (i: number) => (pl.rows[i]?.y ?? 0) + (pl.rows[i]?.h ?? 0);
    const l = pl.rows.findIndex((r, i) => i > 0 && y < r.y && y > below(i - 1));
    return l > 0 ? `${l}` : `y${y}`;
  };
  const byGap = new Map<string, Jog[]>();
  routes.forEach((r, route) => {
    const p = r.points;
    for (let at = 1; at + 2 < p.length; at++) {
      const [a, b] = [p[at], p[at + 1]];
      if (!a || !b || a[1] !== b[1]) continue;
      const key = gapOf(a[1]);
      byGap.set(key, [...(byGap.get(key) ?? []), { route, at }]);
    }
  });
  return byGap;
}

/**
 * Horizontal pieces in the same gap between layers that come close get tracks of their own, `track` apart, in the
 * order of the layered router (`assignTracks`): as few crossings as it finds, and no two verticals side by side. A
 * branch or a confluence that meets in one point stays on one track. A gap with one track keeps its pieces where
 * they are; one with more centres them on its middle and asks, by the layer below it, for the `room` it lacks.
 */
export function separateJogs(routes: readonly Routed[], pl: Placement): { routes: Routed[]; room: number[] } {
  const moved = routes.map((r) => [...r.points]);
  const room = pl.rows.map(() => 0);
  for (const [key, jogs] of jogsByGap(routes, pl)) {
    const pieces = join(jogs.map((j) => pieceOf(routes[j.route]?.points ?? [], j)));
    const count = assignTracks(pieces, ACT.track);
    if (count < 2) continue;
    const gap = pl.gaps[Number(key) - 1];
    const first = routes[jogs[0]?.route ?? 0]?.points[jogs[0]?.at ?? 0]?.[1] ?? 0;
    const middle = gap ? (gap.top + gap.bottom) / 2 : first;
    if (gap) room[Number(key)] = Math.max(0, gapHeight(count, MEASURE) - (gap.bottom - gap.top));
    for (const p of pieces) {
      const y = middle + (p.track - (count - 1) / 2) * ACT.track;
      for (const j of p.jogs) {
        const points = moved[j.route];
        const [a, b] = [points?.[j.at], points?.[j.at + 1]];
        if (points && a && b) points.splice(j.at, 2, [a[0], y], [b[0], y]);
      }
    }
  }
  return { routes: routes.map((r, i) => ({ ...r, points: moved[i] ?? r.points })), room };
}
