import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, cy, right, type Side, segmentHitsRect, segmentsCross } from '../../geometry.js';
import { type Board, type Box, obstaclesFor } from '../boxes.js';
import type { Plan } from '../grid.js';
import { freeZigzag, type Lane } from '../shape.js';

/** The gaps on either side of a column or row, by their number. */
const around = (index: number): number[] => [index - 1, index];

const inside = (r: Rect, p: Point): boolean => p[0] >= r.x && p[0] <= right(r) && p[1] >= r.y && p[1] <= bottom(r);

const length = (points: readonly Point[]): number =>
  points.slice(1).reduce((n, q, i) => {
    const p = points[i] as Point;
    return n + Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
  }, 0);

/** Whether cost `a` is lower than `b`, comparing their numbers in order. */
const before = (a: readonly number[], b: readonly number[]): boolean => {
  const k = a.findIndex((n, i) => n !== b[i]);
  return k >= 0 && (a[k] as number) < (b[k] as number);
};

/** The way out of a box towards a gap, across the gap's axis: the side and the point in its middle. */
function exit(box: Box, lane: Lane): { side: Side; at: Point } {
  const r = box.rect;
  if (lane.axis === 'col') {
    const side = lane.at > cx(r) ? 'right' : 'left';
    return { side, at: [side === 'right' ? right(r) : r.x, cy(r)] };
  }
  const side = lane.at > cy(r) ? 'bottom' : 'top';
  return { side, at: [cx(r), side === 'bottom' ? bottom(r) : r.y] };
}

/** A way of a plan that bends three times, with its points through the middles of its gaps. */
export interface ThreeBends {
  readonly plan: Plan;
  readonly points: readonly Point[];
}

/**
 * Every way of `p` that bends three times and runs through nothing: out of its first box into a gap beside it, along
 * that gap into a gap of the other axis beside its second box, and along that into the box.
 */
export function threeBends(board: Board, p: Plan): ThreeBends[] {
  if (p.shape === 'loop' || p.edge.route) return [];
  const obstacles = obstaclesFor(board, p.edge, true).filter((o) => o.id !== p.a.id && o.id !== p.b.id);
  const { cols, rows } = board.layout.gutters;
  const lanes = (axis: Lane['axis'], box: Box): Lane[] =>
    around(axis === 'col' ? box.colIndex : box.rowIndex).flatMap((index) => {
      const at = (axis === 'col' ? cols : rows)[index];
      return at === undefined ? [] : [{ axis, index, at, dir: 1 as const }];
    });
  const blocked = (points: readonly Point[]) =>
    points.slice(1).some((q, i) => obstacles.some((o) => segmentHitsRect(points[i] as Point, q, o.rect, 4)));
  const out: ThreeBends[] = [];
  for (const [first, second] of [
    ['col', 'row'],
    ['row', 'col'],
  ] as const) {
    for (const lane of lanes(first, p.a)) {
      for (const via of lanes(second, p.b)) {
        const from = exit(p.a, lane);
        const to = exit(p.b, via);
        const corner: Point = first === 'col' ? [lane.at, via.at] : [via.at, lane.at];
        const points: Point[] =
          first === 'col'
            ? [from.at, [lane.at, from.at[1]], corner, [to.at[0], via.at], to.at]
            : [from.at, [from.at[0], lane.at], corner, [via.at, to.at[1]], to.at];
        if (blocked(points)) continue;
        out.push({ plan: { ...p, shape: 'Z', fromSide: from.side, toSide: to.side, lane, via }, points });
      }
    }
  }
  return out;
}

/**
 * A Z that runs through a box on every gap it may take, such as a line to a corner of the grid with boxes on both of
 * its Ls, bends three times instead (`threeBends`). Of the ways that run through nothing, the one that stays inside
 * the frames holding both boxes, then the one that crosses the fewest `others`, then the shortest; a Z without one
 * stays as it is, and the line check reports it.
 */
export function detour(board: Board, p: Plan, others: readonly (readonly Point[])[]): Plan {
  if (p.shape !== 'Z' || !p.lane || p.edge.route) return p;
  const obstacles = obstaclesFor(board, p.edge, true).filter((o) => o.id !== p.a.id && o.id !== p.b.id);
  if (freeZigzag(p.a, p.b, p.lane, obstacles)) return p;
  const frames = board.layout.groups
    .map((g) => g.rect)
    .filter((r) => [p.a.rect, p.b.rect].every((b) => inside(r, [cx(b), cy(b)])));
  const leaves = (points: readonly Point[]) => points.filter((q) => frames.some((r) => !inside(r, q))).length;
  const crossings = (points: readonly Point[]) =>
    points
      .slice(1)
      .reduce(
        (n, q, i) =>
          n +
          others.reduce(
            (k, line) =>
              k + line.slice(1).filter((b, j) => segmentsCross(points[i] as Point, q, line[j] as Point, b)).length,
            0,
          ),
        0,
      );
  let best: { plan: Plan; cost: readonly number[] } | undefined;
  for (const { plan, points } of threeBends(board, p)) {
    const cost = [leaves(points), crossings(points), length(points)];
    if (!best || before(cost, best.cost)) best = { plan, cost };
  }
  return best?.plan ?? p;
}
