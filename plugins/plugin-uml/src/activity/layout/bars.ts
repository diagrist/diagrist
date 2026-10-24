import type { Point, Rect } from '@diagrist/core';
import type { LayerEdge } from '@diagrist/layout-grid';
import { ACT, cx, right } from './metrics.js';
import type { ActivityRanks } from './rank.js';

/** Centre of a node or waypoint. */
type Where = (id: string) => number;

/** Horizontal neighbours of a bar: what hangs on it before and after, without back edges. */
function attached(bar: string, ranks: ActivityRanks, where: Where): number[] {
  return ranks.flows.flatMap((f) => {
    if (f.back) return [];
    if (f.from === bar) return [where(f.dummies[0] ?? f.to)];
    if (f.to === bar) return [where(f.dummies.at(-1) ?? f.from)];
    return [];
  });
}

/**
 * Fork and join are bars across the flow: as wide as the branches hanging on them, plus overhang, so every branch
 * docks vertically. Other nodes of the same layer bound the bar; one that blocks its way to a branch comes back as
 * an edge `blocker -> bar`, so the bar can move one layer down.
 */
export function expandBars(
  bars: readonly string[],
  rects: Map<string, Rect>,
  points: ReadonlyMap<string, Point>,
  ranks: ActivityRanks,
): LayerEdge[] {
  const pushes: LayerEdge[] = [];
  const where: Where = (id) => {
    const r = rects.get(id);
    return r ? cx(r) : (points.get(id)?.[0] ?? 0);
  };
  for (const bar of bars) {
    const r = rects.get(bar);
    if (!r) continue;
    const xs = attached(bar, ranks, where);
    const layer = ranks.layerOf.get(bar);
    const others = ranks.ids
      .filter((id) => id !== bar && ranks.layerOf.get(id) === layer)
      .map((id) => ({ id, r: rects.get(id) ?? { x: where(id), y: 0, w: 0, h: 0 } }));
    const half = ACT.track;
    const leftWall = Math.max(-Infinity, ...others.filter((o) => cx(o.r) < cx(r)).map((o) => right(o.r) + half));
    const rightWall = Math.min(Infinity, ...others.filter((o) => cx(o.r) > cx(r)).map((o) => o.r.x - half));
    for (const o of others) {
      const between = xs.some(
        (x) => (x > cx(r) && o.r.x < x && cx(o.r) > cx(r)) || (x < cx(r) && right(o.r) > x && cx(o.r) < cx(r)),
      );
      if (between && rects.has(o.id)) pushes.push({ from: o.id, to: bar, rank: 1 });
    }
    const lo = Math.max(leftWall, Math.min(r.x, ...xs.map((x) => x - ACT.barOverhang)));
    const hi = Math.min(rightWall, Math.max(right(r), ...xs.map((x) => x + ACT.barOverhang)));
    rects.set(bar, { ...r, x: lo, w: hi - lo });
  }
  return pushes;
}
