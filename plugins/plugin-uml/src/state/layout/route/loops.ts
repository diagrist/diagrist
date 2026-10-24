import type { Point, Rect } from '@diagrist/core';
import type { GridLayout, Route, Side } from '@diagrist/layout-grid';
import { STATE as S } from '../metrics.js';
import { bottom, right, segmentHits } from '../points/geometry.js';

/** Corners in the order of preference: top right as on the learning platform, then the others. */
const CORNERS = [
  { x: 1, y: -1 },
  { x: 1, y: 1 },
  { x: -1, y: -1 },
  { x: -1, y: 1 },
] as const;

type Corner = (typeof CORNERS)[number];

/** A loop laid by the kind: points and the sides it leaves and enters. */
export interface Loop {
  readonly points: readonly Point[];
  readonly fromSide: Side;
  readonly toSide: Side;
}

/**
 * A transition of a state to itself: a rectangular loop entirely outside a corner, out sideways and back in from
 * above or below. The default is the top right corner.
 */
export function stateLoop(rect: Rect, corner: Corner = CORNERS[0]): Loop {
  const reach = S.loopReach;
  const side = corner.x > 0 ? right(rect) : rect.x;
  const edge = corner.y < 0 ? rect.y : bottom(rect);
  const out = edge - corner.y * Math.min(rect.h / 3, reach / 2);
  const into = side - corner.x * Math.min(rect.w / 4, reach);
  const outer = side + corner.x * reach;
  const over = edge + corner.y * reach;
  return {
    points: [
      [side, out],
      [outer, out],
      [outer, over],
      [into, over],
      [into, edge],
    ],
    fromSide: corner.x > 0 ? 'right' : 'left',
    toSide: corner.y < 0 ? 'top' : 'bottom',
  };
}

const hull = (points: readonly Point[]): Rect => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    h: Math.max(...ys) - Math.min(...ys),
  };
};

/** How many foreign line pieces and nodes the area of the loop touches; nodes weigh ten. */
function conflicts(
  points: readonly Point[],
  own: number,
  routes: readonly Route[],
  grid: GridLayout,
  id: string,
): number {
  const area = hull(points);
  const lines = routes.reduce(
    (n, r, i) =>
      i === own ? n : n + r.points.slice(1).filter((p, k) => segmentHits(r.points[k] ?? p, p, area, 6)).length,
    0,
  );
  const corners: [Point, Point] = [
    [area.x, area.y],
    [right(area), bottom(area)],
  ];
  const nodes = grid.nodes.filter((n) => n.id !== id && segmentHits(corners[0], corners[1], n.rect, 6));
  return lines + 10 * nodes.length;
}

/**
 * Each loop at the corner of its state where the fewest other lines dock or pass; on a tie the order top right,
 * bottom right, top left, bottom left. `loops` names the state of each loop by route index.
 */
export function placeLoops(
  routes: readonly Route[],
  loops: ReadonlyMap<number, string>,
  grid: GridLayout,
): Map<number, Loop> {
  const out = new Map<number, Loop>();
  const current = [...routes];
  for (const [i, id] of loops) {
    const rect = grid.nodes.find((n) => n.id === id)?.rect;
    if (!rect) continue;
    let best: { loop: Loop; score: number } | undefined;
    for (const corner of CORNERS) {
      const loop = stateLoop(rect, corner);
      const score = conflicts(loop.points, i, current, grid, id);
      if (!best || score < best.score) best = { loop, score };
    }
    if (!best) continue;
    out.set(i, best.loop);
    const r = current[i];
    if (r) current[i] = { ...r, ...best.loop };
  }
  return out;
}
