import type { Point } from '@diagrist/core';
import { segmentsCross } from '../../geometry.js';
import { type Trade, tradeOf, trades } from '../../layered/detour.js';
import { linesOfLaid } from '../../score.js';
import { type Board, obstaclesFor } from '../boxes.js';
import type { Plan } from '../grid.js';
import { type Routed, toRoute } from '../routed.js';
import { freeWays, type Lane } from '../shape.js';
import { threeBends } from './detour.js';
import { freeOf, intersect } from './free.js';
import { grows, leaves } from './inside.js';
import { keeps } from './ways.js';

/** How often every edge tries its other ways; a way one edge leaves can open a way for another. */
const ROUNDS = 2;

/** The gaps of an axis, as lanes a Z may take, and the lanes beyond its first and last track. */
function lanesOf(board: Board, axis: Lane['axis']): Lane[] {
  const g = board.layout.gutters;
  const mids = axis === 'col' ? g.cols : g.rows;
  const gaps = mids.map((at, index): Lane => ({ axis, index, at, dir: 1 }));
  const margins = g.margins?.[axis === 'col' ? 'cols' : 'rows'];
  if (!margins) return gaps;
  const [lo, hi] = margins;
  return [
    { axis, index: -1, at: lo, dir: -1, outer: true },
    ...gaps,
    { axis, index: mids.length, at: hi, dir: 1, outer: true },
  ];
}

const keyOf = (q: Plan): string =>
  [q.shape, q.fromSide, q.toSide, q.lane?.axis, q.lane?.at, q.via?.axis, q.via?.at].join('|');

/**
 * Every way `p` may take besides its own that runs through nothing: straight where both sides share a free stretch,
 * both Ls, a Z over every gap of either axis between its boxes or next to them, and each way that bends three times, all of them inside the frames
 * holding both its boxes, and a Z over a lane beyond the grid where those frames can grow around it (`grows`).
 */
function waysOf(board: Board, p: Plan): Plan[] {
  if (p.shape === 'loop' || p.edge.route) return [];
  const obstacles = obstaclesFor(board, p.edge, true);
  const near = (lane: Lane) => {
    const [ia, ib] = lane.axis === 'col' ? [p.a.colIndex, p.b.colIndex] : [p.a.rowIndex, p.b.rowIndex];
    return lane.index >= Math.min(ia, ib) - 1 && lane.index <= Math.max(ia, ib);
  };
  const lanes = [...lanesOf(board, 'col'), ...lanesOf(board, 'row')].filter((lane) =>
    lane.outer ? grows(board, p, lane) : near(lane) && !leaves(board, p, lane),
  );
  const { via: _, ...rest } = p;
  const plain = freeWays(p.a, p.b, obstacles, lanes).map(
    (s): Plan => ({
      ...rest,
      shape: s.shape,
      fromSide: s.fromSide,
      toSide: s.toSide,
      lane: s.shape === 'Z' ? s.lane : undefined,
    }),
  );
  const gap = board.tree.spec.metrics.laneGap;
  const facing = (q: Plan) =>
    intersect(freeOf(board, q.a, q.fromSide, gap), freeOf(board, q.b, q.toSide, gap)).length > 0;
  const seen = new Set([keyOf(p)]);
  const bent = threeBends(board, p).flatMap((t) =>
    t.plan.lane && t.plan.via && [t.plan.lane, t.plan.via].some((l) => leaves(board, p, l)) ? [] : [t.plan],
  );
  return [...plain, ...bent].filter((q) => {
    const k = keyOf(q);
    if (q.shape === 'straight' && !facing(q)) return false;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** What routes cost, read as the line check reads a drawing without its texts; the boxes stay where they stand. */
function priceOf(board: Board, routes: readonly Routed[]): Trade {
  const grid = board.layout;
  return tradeOf(
    linesOfLaid({
      nodes: grid.nodes,
      routes: routes.map(toRoute),
      ends: routes.map((r) => [r.edge.from, r.edge.to] as const),
      labels: [],
      frames: grid.groups.map((g) => ({ id: g.id, rect: g.rect })),
      width: grid.width,
      height: grid.bottom,
    }),
    false,
  );
}

/** Whether two routes cross. */
const cross = (a: Routed, b: Routed): boolean =>
  a.points
    .slice(1)
    .some((p, i) => b.points.slice(1).some((q, k) => segmentsCross(a.points[i] as Point, p, b.points[k] as Point, q)));

/** The routes worth another way: those that cross another route or bend more than twice. */
const involved = (routes: readonly Routed[]): Set<number> =>
  new Set(routes.flatMap((r, i) => (r.points.length > 4 || routes.some((o, k) => k !== i && cross(r, o)) ? [i] : [])));

/**
 * Plans priced by the measure (ADR 0039, owner decision D2 of 07.11.2026): starting from the plans the channel
 * stage chose, every edge whose route crosses another or bends more than twice tries each other way it may take
 * (`waysOf`), the whole picture is routed again by `route`, and the way stays where the picture trades better by the
 * rule of the detour (`trades`): no hard finding more, a crossing worth 600 px of line, and of as many crossings the
 * cheaper by `scoreOf`. In rounds, until none trades better. An edge that keeps its way (`GridEdge.way`) and an
 * adaptive grid keep their plans.
 */
export function pricedPlans(
  board: Board,
  planned: readonly Plan[],
  route: (plans: readonly Plan[]) => Routed[],
): Plan[] {
  if (board.tree.spec.adaptive) return [...planned];
  let best = [...planned];
  let laid = route(best);
  let price = priceOf(board, laid);
  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;
    for (const i of involved(laid)) {
      if (keeps(best[i] as Plan)) continue;
      for (const way of waysOf(board, best[i] as Plan)) {
        const next = best.map((q, k) => (k === i ? way : q));
        const routes = route(next);
        const tried = priceOf(board, routes);
        if (!trades(price, tried, 'score')) continue;
        [best, laid, price, moved] = [next, routes, tried, true];
      }
    }
    if (!moved) break;
  }
  return best;
}
