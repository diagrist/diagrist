import { ACT, type XY } from './metrics.js';
import type { Routed } from './route.js';

interface Jog {
  readonly route: number;
  readonly at: number;
  readonly lo: number;
  readonly hi: number;
}

/** Horizontal pieces that hang on no node: every horizontal piece but the first and the last. */
function jogsOf(routes: readonly Routed[]): Map<number, Jog[]> {
  const byY = new Map<number, Jog[]>();
  routes.forEach((r, route) => {
    const p = r.points;
    for (let at = 1; at + 2 < p.length; at++) {
      const [a, b] = [p[at], p[at + 1]];
      if (!a || !b || a[1] !== b[1]) continue;
      const jog = { route, at, lo: Math.min(a[0], b[0]), hi: Math.max(a[0], b[0]) };
      byY.set(a[1], [...(byY.get(a[1]) ?? []), jog]);
    }
  });
  return byY;
}

const OFFSETS = [0, -1, 1, -2, 2, -3, 3];

/**
 * Horizontal pieces in the same gap between layers that cover each other get tracks of their own, `track` apart;
 * touching in one point only (a branch, a confluence) stays on one track.
 */
export function separateJogs(routes: readonly Routed[]): Routed[] {
  const moved = routes.map((r) => r.points.map((p): XY => [p[0], p[1]]));
  for (const [y, jogs] of jogsOf(routes)) {
    const taken: { lo: number; hi: number; y: number }[] = [];
    for (const jog of jogs) {
      const free = OFFSETS.map((k) => y + k * ACT.track).find(
        (ty) => !taken.some((t) => t.y === ty && t.lo < jog.hi - 1 && jog.lo < t.hi - 1),
      );
      const ty = free ?? y;
      taken.push({ lo: jog.lo, hi: jog.hi, y: ty });
      const points = moved[jog.route];
      const [a, b] = [points?.[jog.at], points?.[jog.at + 1]];
      if (a) a[1] = ty;
      if (b) b[1] = ty;
    }
  }
  return routes.map((r, i) => ({ ...r, points: moved[i] ?? r.points }));
}
