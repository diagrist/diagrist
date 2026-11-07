import { type Trade, tradeOf, trades } from '../../layered/detour.js';
import { linesOfLaid } from '../../score.js';
import { type Board, obstaclesFor } from '../boxes.js';
import type { Plan } from '../grid.js';
import { type Routed, toRoute } from '../routed.js';
import { freeWays, type Lane } from '../shape.js';
import { threeBends } from './detour.js';
import { freeOf, intersect } from './free.js';
import { leaves } from './inside.js';

/** How often every edge tries its other ways; a way one edge leaves can open a way for another. */
const ROUNDS = 2;

/** The gaps of an axis, as lanes a Z may take. */
function lanesOf(board: Board, axis: Lane['axis']): Lane[] {
  const g = board.layout.gutters;
  return (axis === 'col' ? g.cols : g.rows).map((at, index) => ({ axis, index, at, dir: 1 }));
}

const keyOf = (q: Plan): string =>
  [q.shape, q.fromSide, q.toSide, q.lane?.axis, q.lane?.at, q.via?.axis, q.via?.at].join('|');

/**
 * Every way `p` may take besides its own that runs through nothing: straight where both sides share a free stretch,
 * both Ls, a Z over every gap of either axis, and each way that bends three times, all of them inside the frames
 * holding both its boxes.
 */
function waysOf(board: Board, p: Plan): Plan[] {
  if (p.shape === 'loop' || p.edge.route) return [];
  const obstacles = obstaclesFor(board, p.edge, true);
  const lanes = [...lanesOf(board, 'col'), ...lanesOf(board, 'row')].filter((lane) => !leaves(board, p, lane));
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

/**
 * Plans priced by the measure (ADR 0039, owner decision D2 of 07.11.2026): starting from the plans the channel
 * stage chose, every edge in turn tries each other way it may take (`waysOf`), the whole picture is routed again by
 * `route`, and the way stays where the picture trades better by the rule of the detour (`trades`): no hard finding
 * more, a crossing worth 600 px of line, and of as many crossings the cheaper by `scoreOf`. In rounds, until none
 * trades better. An adaptive grid keeps its plans.
 */
export function pricedPlans(
  board: Board,
  planned: readonly Plan[],
  route: (plans: readonly Plan[]) => Routed[],
): Plan[] {
  if (board.tree.spec.adaptive) return [...planned];
  let best = [...planned];
  let price = priceOf(board, route(best));
  for (let round = 0; round < ROUNDS; round++) {
    let moved = false;
    for (let i = 0; i < best.length; i++) {
      for (const way of waysOf(board, best[i] as Plan)) {
        const next = best.map((q, k) => (k === i ? way : q));
        const tried = priceOf(board, route(next));
        if (!trades(price, tried, 'score')) continue;
        [best, price, moved] = [next, tried, true];
      }
    }
    if (!moved) break;
  }
  return best;
}
