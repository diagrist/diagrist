import type { Point } from '@diagrist/core';
import { bottom, cx, cy, right, type Side, segmentHitsRect, segmentsCross } from '../../geometry.js';
import { type Board, type Box, obstaclesFor } from '../boxes.js';
import type { Plan } from '../grid.js';
import { freeZigzag, type Lane } from '../shape.js';

/** The gaps on either side of a column or row, by their number. */
const around = (index: number): number[] => [index - 1, index];

const length = (points: readonly Point[]): number =>
  points.slice(1).reduce((n, q, i) => {
    const p = points[i] as Point;
    return n + Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
  }, 0);

/** The way out of a box towards a gap, across the gap's axis: the side and the point in its middle. */
function out(box: Box, lane: Lane): { side: Side; at: Point } {
  const r = box.rect;
  if (lane.axis === 'col') {
    const side = lane.at > cx(r) ? 'right' : 'left';
    return { side, at: [side === 'right' ? right(r) : r.x, cy(r)] };
  }
  const side = lane.at > cy(r) ? 'bottom' : 'top';
  return { side, at: [cx(r), side === 'bottom' ? bottom(r) : r.y] };
}

/**
 * A Z that runs through a box on every gap it may take, such as a line to a corner of the grid with boxes on both of
 * its Ls, bends three times instead: out of its first box into a gap beside it, along that gap into a gap of the other
 * axis beside its second box, and along that into the box. Of the ways that run through nothing, the one that
 * crosses the fewest `others`, then the shortest; a Z
 * without one stays as it is, and the line check reports it.
 */
export function detour(board: Board, p: Plan, others: readonly (readonly Point[])[]): Plan {
  if (p.shape !== 'Z' || !p.lane || p.edge.route) return p;
  const obstacles = obstaclesFor(board, p.edge, true).filter((o) => o.id !== p.a.id && o.id !== p.b.id);
  if (freeZigzag(p.a, p.b, p.lane, obstacles)) return p;
  const { cols, rows } = board.layout.gutters;
  const lanes = (axis: Lane['axis'], box: Box): Lane[] =>
    around(axis === 'col' ? box.colIndex : box.rowIndex).flatMap((index) => {
      const at = (axis === 'col' ? cols : rows)[index];
      return at === undefined ? [] : [{ axis, index, at, dir: 1 as const }];
    });
  const blocked = (points: readonly Point[]) =>
    points.slice(1).some((q, i) => obstacles.some((o) => segmentHitsRect(points[i] as Point, q, o.rect, 4)));
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
  let best: { plan: Plan; cost: readonly [number, number] } | undefined;
  for (const [first, second] of [
    ['col', 'row'],
    ['row', 'col'],
  ] as const) {
    for (const lane of lanes(first, p.a)) {
      for (const via of lanes(second, p.b)) {
        const from = out(p.a, lane);
        const to = out(p.b, via);
        const corner: Point = first === 'col' ? [lane.at, via.at] : [via.at, lane.at];
        const points: Point[] =
          first === 'col'
            ? [from.at, [lane.at, from.at[1]], corner, [to.at[0], via.at], to.at]
            : [from.at, [from.at[0], lane.at], corner, [via.at, to.at[1]], to.at];
        if (blocked(points)) continue;
        const cost = [crossings(points), length(points)] as const;
        if (!best || cost[0] < best.cost[0] || (cost[0] === best.cost[0] && cost[1] < best.cost[1]))
          best = { plan: { ...p, fromSide: from.side, toSide: to.side, lane, via }, cost };
      }
    }
  }
  return best?.plan ?? p;
}
