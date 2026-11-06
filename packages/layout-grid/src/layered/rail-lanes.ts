import type { Rect } from '@diagrist/core';
import type { RailSide } from './rail-order.js';
import type { Ranked } from './rank.js';
import type { LayeredEdge } from './spec.js';

/** The place of the lane a node or placeholder stands in, left to right. */
export type LaneOf = (id: string) => number;

/** The lane a rail runs in on `side`: the outer of the lanes of its ends. */
export const railLane = (e: LayeredEdge, side: RailSide, lane: LaneOf): number =>
  side === 'right' ? Math.max(lane(e.from), lane(e.to)) : Math.min(lane(e.from), lane(e.to));

/**
 * The sides of its layer at which `n` stands outermost for a rail in lane `at`: no box between it and the lanes
 * beyond `at` on that side, so its piece out of `n` to the rail passes none.
 */
function outermostIn(
  n: string,
  ranked: Ranked,
  layers: readonly (readonly string[])[],
  lane: LaneOf,
  at: Readonly<Record<RailSide, number>>,
): RailSide[] {
  const layer = (layers[ranked.layerOf.get(n) ?? -1] ?? []).filter((k) => !ranked.dummies.has(k));
  const i = layer.indexOf(n);
  const out: RailSide[] = [];
  if (layer.slice(0, i).every((k) => lane(k) < at.left)) out.push('left');
  if (layer.slice(i + 1).every((k) => lane(k) > at.right)) out.push('right');
  return out;
}

/**
 * The sides each rail may take in a picture with lanes (ADR 0039, 11): where both its ends stand outermost among the
 * boxes of their layer up to the lane it runs in, so a loop runs beside its own lane and not around the picture.
 */
export function laneRailSides(
  rails: readonly LayeredEdge[],
  ranked: Ranked,
  layers: readonly (readonly string[])[],
  lane: LaneOf,
  allowed: (e: LayeredEdge) => readonly RailSide[],
): Map<string, RailSide[]> {
  return new Map(
    rails.map((e) => {
      const at = { left: railLane(e, 'left', lane), right: railLane(e, 'right', lane) };
      const [a, b] = [outermostIn(e.from, ranked, layers, lane, at), outermostIn(e.to, ranked, layers, lane, at)];
      return [e.id, a.filter((s) => b.includes(s) && allowed(e).includes(s))] as const;
    }),
  );
}

/**
 * The track of a rail in lane `at` on `side`: `lead` beyond the boxes of its lane and the lanes inside it, then past
 * every other box in its way, such as a bar that reaches over the next lanes, so it cuts through none.
 */
export function laneTrack(
  side: RailSide,
  boxes: readonly (readonly [string, Rect])[],
  lane: LaneOf,
  at: number,
  lead: number,
): number {
  const right = (r: Rect) => r.x + r.w;
  const inside = boxes.filter(([n]) => (side === 'right' ? lane(n) <= at : lane(n) >= at)).map(([, r]) => r);
  let x = side === 'right' ? Math.max(...inside.map(right)) + lead : Math.min(...inside.map((r) => r.x)) - lead;
  for (let moved = true; moved; ) {
    const hit = boxes.find(([, r]) => r.x - lead < x && x < right(r) + lead);
    moved = hit !== undefined;
    if (hit) x = side === 'right' ? right(hit[1]) + lead : hit[1].x - lead;
  }
  return x;
}

/**
 * How many pieces of `lines` a rail on `side` at `at` crosses: its pieces out of `upper` and `lower` at their
 * middles and its track between.
 */
export function railCrossings(
  side: RailSide,
  at: number,
  upper: Rect,
  lower: Rect,
  lines: readonly { readonly points: readonly (readonly [number, number])[] }[],
): number {
  const edge = (r: Rect) => (side === 'left' ? r.x : r.x + r.w);
  const [ya, yb] = [upper.y + upper.h / 2, lower.y + lower.h / 2];
  const own: [number, number, number, number][] = [
    [edge(upper), ya, at, ya],
    [at, ya, at, yb],
    [at, yb, edge(lower), yb],
  ];
  let count = 0;
  for (const l of lines)
    for (let k = 0; k + 1 < l.points.length; k++) {
      const [p, q] = [l.points[k], l.points[k + 1]];
      if (!p || !q) continue;
      for (const [x1, y1, x2, y2] of own) {
        const flat = y1 === y2;
        const [lo, hi] = flat ? [Math.min(x1, x2), Math.max(x1, x2)] : [Math.min(y1, y2), Math.max(y1, y2)];
        const upright = p[0] === q[0];
        if (flat && upright) {
          const [a, b] = [Math.min(p[1], q[1]), Math.max(p[1], q[1])];
          if (p[0] > lo && p[0] < hi && y1 > a && y1 < b) count++;
        } else if (!flat && !upright) {
          const [a, b] = [Math.min(p[0], q[0]), Math.max(p[0], q[0])];
          if (p[1] > lo && p[1] < hi && x1 > a && x1 < b) count++;
        }
      }
    }
  return count;
}
