import type { Point } from '@diagrist/core';
import { bottom, cx, cy, OPPOSITE, right, type Side, segmentHitsRect } from '../../geometry.js';
import { type Board, type Box, obstaclesFor } from '../boxes.js';
import { edgePoints, type Plan, plans } from '../grid.js';
import { portPoint } from '../ports.js';
import type { Routed } from '../routed.js';
import { detour } from './detour.js';
import { freeOf, intersect } from './free.js';
import { keepInside } from './inside.js';
import { channelPorts } from './ports.js';
import { pricedPlans } from './priced.js';
import { relieve } from './relieve.js';
import { zLanes } from './tracks.js';
import { untangle } from './untangle.js';

const flat = (side: Side): boolean => side === 'top' || side === 'bottom';

/** Where a box ends on a side, across it. */
const edgeAt = (box: Box, side: Side): number =>
  side === 'right' ? right(box.rect) : side === 'left' ? box.rect.x : side === 'bottom' ? bottom(box.rect) : box.rect.y;

/**
 * An edge between boxes that face each other across a gap, such as a node and a frame beside it whose middle lies in
 * another row, runs straight in the middle of the stretch both sides share when nothing stands in between.
 */
function straightIfFacing(board: Board, p: Plan, gap: number): Plan {
  if (p.shape === 'straight' || p.shape === 'loop') return p;
  const [a, b] = [p.a.rect, p.b.rect];
  const across =
    a.y + a.h <= b.y || b.y + b.h <= a.y ? 'vertical' : a.x + a.w <= b.x || b.x + b.w <= a.x ? 'horizontal' : undefined;
  if (!across) return p;
  const fromSide: Side = across === 'horizontal' ? (b.x > a.x ? 'right' : 'left') : b.y > a.y ? 'bottom' : 'top';
  const toSide = OPPOSITE[fromSide];
  const shared = intersect(freeOf(board, p.a, fromSide, gap), freeOf(board, p.b, toSide, gap));
  const first = shared[0];
  if (!first) return p;
  const at = (first[0] + first[1]) / 2;
  const start: Point = flat(fromSide) ? [at, edgeAt(p.a, fromSide)] : [edgeAt(p.a, fromSide), at];
  const end: Point = flat(fromSide) ? [at, edgeAt(p.b, toSide)] : [edgeAt(p.b, toSide), at];
  const blocked = obstaclesFor(board, p.edge, true).some(
    (o) => o.id !== p.a.id && o.id !== p.b.id && segmentHitsRect(start, end, o.rect, 4),
  );
  return blocked ? p : { ...p, shape: 'straight', fromSide, toSide, lane: undefined };
}

/**
 * A straight edge whose boxes share no free stretch of their facing sides bends twice instead of running slanted:
 * a Z over the middle between the two sides.
 */
function bendUnshared(board: Board, p: Plan, gap: number): Plan {
  if (p.shape !== 'straight') return p;
  const shared = intersect(freeOf(board, p.a, p.fromSide, gap), freeOf(board, p.b, p.toSide, gap));
  if (shared.length > 0) return p;
  const at = (edgeAt(p.a, p.fromSide) + edgeAt(p.b, p.toSide)) / 2;
  const axis = flat(p.fromSide) ? 'row' : 'col';
  const towards = axis === 'col' ? cx(p.b.rect) > cx(p.a.rect) : cy(p.b.rect) > cy(p.a.rect);
  return { ...p, shape: 'Z', lane: { axis, index: -1, at, dir: towards ? 1 : -1 } };
}

/**
 * An end on the lower side of a node with a caption, such as a figure or a circle with its name below, moves below
 * the caption along its first or last piece, so the line does not run through the text.
 */
function belowCaption(board: Board, r: Routed): Routed {
  const below = (box: Box) => (box.id.startsWith('group:') ? undefined : board.node(box.id)?.caption?.below);
  const points = [...r.points];
  const move = (at: number, next: number, box: Box) => {
    const p = points[at];
    const q = points[next];
    const by = below(box);
    if (!p || !q || by === undefined || p[0] !== q[0] || q[1] <= p[1] + by) return;
    points[at] = [p[0], p[1] + by];
  };
  if (r.fromSide === 'bottom') move(0, 1, r.from);
  if (r.toSide === 'bottom') move(points.length - 1, points.length - 2, r.to);
  return { ...r, points };
}

/** The routes of planned edges: ports per side, tracks per gap, the points between and the ends below captions. */
function routesOf(board: Board, planned: readonly Plan[]): Routed[] {
  const m = board.tree.spec.metrics;
  const ports = channelPorts(board, planned, m.portSpread, m.laneGap);
  const lanes = zLanes(planned, ports, m.laneGap);
  return planned.map((p): Routed => {
    const own = p.edge.route;
    if (own) return { edge: p.edge, from: p.a, to: p.b, shape: 'loop', ...own };
    const port = ports.get(p) ?? { from: 0, to: 0 };
    const start = portPoint(p.a.rect, p.fromSide, port.from);
    const end = portPoint(p.b.rect, p.toSide, port.to);
    const at = lanes.get(p);
    const lane = p.lane && at !== undefined ? { axis: p.lane.axis, ...at } : undefined;
    const points = edgePoints(p.shape, p.fromSide, start, end, lane, p.edge.loopReach ?? m.loopReach);
    const routed = { edge: p.edge, from: p.a, to: p.b, shape: p.shape, points, fromSide: p.fromSide, toSide: p.toSide };
    return belowCaption(board, routed);
  });
}

/**
 * Routes of a fixed grid through its channels (ADR 0038): shape and sides as `gridRoutes` chooses them, with the
 * heads of frames where their kind draws them as obstacles; ends spread over the free stretches of their sides, two
 * edges between the same boxes on ports of their own; and the middle pieces of the Zs of one gap on tracks of their
 * own. A Z that crowds a side moves to another gap (`relieve`), and one that runs through a box on every gap bends
 * three times (`detour`), the way that crosses the fewest of the other routes. From there every edge tries its other
 * ways, priced by the measure (`pricedPlans`), unless `priced` is false. An end below a node starts below its
 * caption. A route the kind laid itself is kept, as a loop.
 */
export function channelRoutes(board: Board, priced = true): Routed[] {
  const m = board.tree.spec.metrics;
  const planned = relieve(
    board,
    plans(board, (b, e) => obstaclesFor(b, e, true)).map((p) =>
      keepInside(board, bendUnshared(board, straightIfFacing(board, p, m.laneGap), m.laneGap)),
    ),
    m.portSpread,
    m.laneGap,
  );
  const first = routesOf(board, planned);
  const others = (i: number) => first.filter((_, k) => k !== i).map((r) => r.points);
  const detoured = planned.map((p, i) => detour(board, p, others(i)));
  if (!priced) return routesOf(board, detoured);
  return routesOf(
    board,
    pricedPlans(board, detoured, (ps) => untangle(routesOf(board, ps), board)),
  );
}
