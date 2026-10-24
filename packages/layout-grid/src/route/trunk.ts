import type { Point, Rect } from '@diagrist/core';
import { bottom, right, segmentHitsRect } from '../geometry.js';
import type { PortRequest } from './adaptive-ports.js';
import { type Board, groupKey } from './boxes.js';
import type { BundlePlan } from './bundle.js';
import { mapRect, turnFor } from './rotate.js';
import { simplify } from './search.js';

type Interval = readonly [number, number];

/** Free parts of [lo, hi] once the blocked intervals are taken out. */
function freeIntervals(lo: number, hi: number, blocked: readonly Interval[]): Interval[] {
  const out: Interval[] = [];
  let cursor = lo;
  for (const [a, b] of [...blocked].sort((p, q) => p[0] - q[0])) {
    if (a > cursor) out.push([cursor, Math.min(a, hi)]);
    cursor = Math.max(cursor, b);
    if (cursor >= hi) break;
  }
  if (cursor < hi) out.push([cursor, hi]);
  return out.filter(([a, b]) => b >= a);
}

/** Lane candidates: the middle of the part, then alternately `gap` further out on both sides. */
function candidates(interval: Interval, gap: number): number[] {
  const [a, b] = interval;
  const mid = (a + b) / 2;
  const out = [mid];
  for (let k = 1; mid + k * gap <= b || mid - k * gap >= a; k++) {
    if (mid + k * gap <= b) out.push(mid + k * gap);
    if (mid - k * gap >= a) out.push(mid - k * gap);
  }
  return out;
}

/** Vertical runs of other routes that would merge with a trunk at `x`. */
function nearTrunk(x: number, lo: number, hi: number, used: readonly (readonly Point[])[], gap: number): boolean {
  return used.some((route) =>
    route.slice(1).some((q, i) => {
      const p = route[i] as Point;
      if (p[0] !== q[0] || Math.abs(p[0] - x) >= gap) return false;
      return Math.min(p[1], q[1]) <= hi + gap * 2 && Math.max(p[1], q[1]) >= lo - gap * 2;
    }),
  );
}

/**
 * Points of all members of a bundle, from source to target. The trunk stands in the free part of the gap nearest to
 * the other ends. Without a clear lane, undefined.
 */
export function trunkPaths(
  plan: BundlePlan,
  ports: ReadonlyMap<PortRequest, Point>,
  board: Board,
  used: readonly (readonly Point[])[],
  headers: readonly Rect[],
  gap: number,
): Point[][] | undefined {
  const f = turnFor(plan.side);
  const hubPort = f.to(ports.get(plan.hubRequest) as Point);
  const leafPorts = plan.leafRequests.map((r) => f.to(ports.get(r) as Point));
  const ends = [plan.hub.id, ...plan.leaves.map((l) => l.id)];
  const own = new Set(ends);
  const groups = board.layout.groups;
  const blocks = [
    ...board.nodes.filter((n) => !own.has(n.id)).map((n) => n.rect),
    ...headers.filter((_, i) => !own.has(groupKey((groups[i] as { id: string }).id))),
  ].map((r) => mapRect(r, f.to));
  const borders = groups.flatMap((g) => {
    const r = mapRect(g.rect, f.to);
    return [
      { x: r.x, y: r.y, w: 0, h: r.h },
      { x: right(r), y: r.y, w: 0, h: r.h },
    ];
  });
  const near = Math.min(...leafPorts.map((q) => q[0]));
  const ys = [hubPort[1], ...leafPorts.map((q) => q[1])];
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const blocked = [...blocks, ...borders]
    .filter((r) => r.y <= hi + gap && bottom(r) >= lo - gap && right(r) >= hubPort[0] && r.x <= near)
    .map((r): Interval => [r.x - gap, right(r) + gap]);
  const intervals = freeIntervals(hubPort[0] + gap, near - gap, blocked).sort((a, b) => b[1] - a[1]);
  const mapped = used.map((route) => route.map(f.to));
  for (const x of intervals.flatMap((i) => candidates(i, gap))) {
    if (nearTrunk(x, lo, hi, mapped, gap)) continue;
    const paths = leafPorts.map((q) => simplify([hubPort, [x, hubPort[1]], [x, q[1]], q]));
    const clear = paths.every((path) =>
      path.slice(1).every((q, i) => blocks.every((r) => !segmentHitsRect(path[i] as Point, q, r, gap / 2))),
    );
    if (!clear) continue;
    return paths.map((path) => {
      const back = path.map(f.from);
      return plan.fanIn ? back.reverse() : back;
    });
  }
  return undefined;
}
