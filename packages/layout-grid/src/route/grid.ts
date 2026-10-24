import type { Point } from '@diagrist/core';
import { cx, cy, type Side } from '../geometry.js';
import type { RouteShape } from '../layout.js';
import type { GridEdge } from '../spec.js';
import { type Board, type Box, boxOf, obstaclesFor } from './boxes.js';
import { assignPorts, type Ends, portPoint } from './ports.js';
import type { Routed } from './routed.js';
import { chooseShape, type Lane } from './shape.js';

interface Plan {
  readonly key: number;
  readonly edge: GridEdge;
  readonly a: Box;
  readonly b: Box;
  readonly shape: 'straight' | 'L' | 'Z' | 'loop';
  readonly lane: Lane | undefined;
  readonly fromSide: Side;
  readonly toSide: Side;
}

const isHorizontal = (side: Side) => side === 'left' || side === 'right';

function plans(board: Board): Plan[] {
  const gutters = board.layout.gutters;
  return board.tree.spec.edges.flatMap((edge, key): Plan[] => {
    const a = boxOf(board, edge.from);
    const b = boxOf(board, edge.to);
    if (!a || !b) return [];
    const sides = chooseShape(a, b, obstaclesFor(board, edge), gutters);
    const lane = sides.shape === 'Z' ? sides.lane : undefined;
    return [{ key, edge, a, b, lane, shape: sides.shape, fromSide: sides.fromSide, toSide: sides.toSide }];
  });
}

function endsOf(p: Plan): Ends {
  const horizA = isHorizontal(p.fromSide);
  const horizB = isHorizontal(p.toSide);
  const straight = p.shape === 'straight';
  const zigzag = p.shape === 'Z';
  return {
    from: {
      key: p.key,
      node: p.a.id,
      rect: p.a.rect,
      side: p.fromSide,
      other: horizA ? cy(p.b.rect) : cx(p.b.rect),
      straight,
      zigzag,
      dir: Math.sign(horizA ? cy(p.b.rect) - cy(p.a.rect) : cx(p.b.rect) - cx(p.a.rect)),
    },
    to: {
      key: p.key,
      node: p.b.id,
      rect: p.b.rect,
      side: p.toSide,
      other: horizB ? cy(p.a.rect) : cx(p.a.rect),
      straight,
      zigzag,
      dir: Math.sign(horizB ? cy(p.a.rect) - cy(p.b.rect) : cx(p.a.rect) - cx(p.b.rect)),
    },
  };
}

/** Points of an edge: two for straight, a corner for L, two corners on the lane for Z, five around for a loop. */
function edgePoints(
  shape: RouteShape,
  fromSide: Side,
  start: Point,
  end: Point,
  lane: { readonly axis: Lane['axis']; readonly at: number } | undefined,
  loopReach: number,
): Point[] {
  if (shape === 'straight') return [start, end];
  if (shape === 'loop') {
    const outer = start[0] + loopReach;
    const under = end[1] + loopReach;
    return [start, [outer, start[1]], [outer, under], [end[0], under], end];
  }
  if (shape === 'L' || !lane) {
    const corner: Point = fromSide === 'top' || fromSide === 'bottom' ? [start[0], end[1]] : [end[0], start[1]];
    return [start, corner, end];
  }
  if (lane.axis === 'col') return [start, [lane.at, start[1]], [lane.at, end[1]], end];
  return [start, [start[0], lane.at], [end[0], lane.at], end];
}

/**
 * Routes of a fixed grid in the order of the edges: shape and sides per edge, ports spread per side, and each Z on
 * its own lane in its gap, the next one `laneGap` further.
 */
export function gridRoutes(board: Board): Routed[] {
  const m = board.tree.spec.metrics;
  const used = new Map<string, number>();
  const nextLane = (lane: Lane): number => {
    const key = `${lane.axis}:${lane.index}`;
    const count = used.get(key) ?? 0;
    used.set(key, count + 1);
    return lane.at + count * m.laneGap * lane.dir;
  };
  return assignPorts(plans(board), endsOf, m.portSpread).map((p): Routed => {
    const start = portPoint(p.a.rect, p.fromSide, p.port.from);
    const end = portPoint(p.b.rect, p.toSide, p.port.to);
    const lane = p.lane ? { axis: p.lane.axis, at: nextLane(p.lane) } : undefined;
    return {
      edge: p.edge,
      from: p.a,
      to: p.b,
      shape: p.shape,
      points: edgePoints(p.shape, p.fromSide, start, end, lane, p.edge.loopReach ?? m.loopReach),
      fromSide: p.fromSide,
      toSide: p.toSide,
    };
  });
}
