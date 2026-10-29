import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, OPPOSITE, polylineLength, type Side, segmentHitsRect, segmentsCross } from '../geometry.js';
import { ellipseSides, type Plan, plansOf } from './adaptive-plans.js';
import { adaptivePorts, type PortRequest } from './adaptive-ports.js';
import { type Board, groupKey, headStrips } from './boxes.js';
import { bundlePlans } from './bundle.js';
import { zRoute } from './centred.js';
import type { Routed } from './routed.js';
import { searchPath, simplify } from './search.js';
import { trunkPaths } from './trunk.js';

function offset(point: Point, side: Side, gap: number): Point {
  return [
    point[0] + (side === 'right' ? gap : side === 'left' ? -gap : 0),
    point[1] + (side === 'bottom' ? gap : side === 'top' ? -gap : 0),
  ];
}

/**
 * One attempt in a given order and `mode`: straight connections first, as they read best; then the trunks of
 * bundles around them; then every other edge by path search around nodes, foreign head strips and laid routes.
 */
function routeAttempt(routes: readonly Routed[], board: Board, mode: number, attempt: number): Routed[] {
  const used: Point[][] = [];
  const m = board.tree.spec.metrics;
  const gap = m.laneGap;
  const obstacles = board.nodes.map((n) => n.rect);
  const headers = headStrips(board.layout.groups, m.framePad.top);
  const bundles = bundlePlans(routes, board);
  const plans = ellipseSides(plansOf(routes, board, bundles, mode, attempt, gap), board);
  const requests = [...new Set(plans.flatMap((p) => (p ? [p.from, p.to] : [])))];
  const ports = adaptivePorts(requests, gap, board.tree.spec.ports === 'centred');
  const port = (r: PortRequest) => ports.get(r) as Point;
  const fixed = new Map<number, Routed>();
  const bundled = new Set(bundles.flatMap((bundle) => bundle.members));
  plans.forEach((plan, i) => {
    if (!plan || bundled.has(i)) return;
    const start = port(plan.from);
    const end = port(plan.to);
    if (plan.from.side !== OPPOSITE[plan.to.side] || (start[0] !== end[0] && start[1] !== end[1])) return;
    const own = new Set([plan.a.id, plan.b.id]);
    const blocks = board.nodes.filter((n) => !own.has(n.id)).map((n) => n.rect);
    if (blocks.some((rect) => segmentHitsRect(start, end, rect, gap / 2))) return;
    const points = [start, end];
    fixed.set(i, {
      ...(routes[i] as Routed),
      fromSide: plan.from.side,
      toSide: plan.to.side,
      points,
      shape: 'straight',
    });
    used.push(points);
  });
  for (const bundle of bundles) {
    const paths = trunkPaths(bundle, ports, board, used, headers, gap);
    if (!paths) continue;
    bundle.members.forEach((i, k) => {
      const points = paths[k] as Point[];
      const hub = bundle.side;
      const leaf = OPPOSITE[bundle.side];
      const [fromSide, toSide] = bundle.fanIn ? [leaf, hub] : [hub, leaf];
      const shape = points.length === 2 ? 'straight' : 'orthogonal';
      fixed.set(i, { ...(routes[i] as Routed), fromSide, toSide, points, shape });
      used.push(points);
    });
  }
  return routes.map((r, index) => {
    const done = fixed.get(index);
    if (done) return done;
    if (r.shape === 'loop') {
      used.push([...r.points]);
      return r;
    }
    const plan = plans[index];
    if (!plan) return r;
    const z = board.tree.spec.ports === 'centred' ? zOf(r, plan, port, board, used, gap) : undefined;
    if (z) return z;
    return searched(r, plan, plans, port, board, { obstacles, headers, used, gap });
  });
}

/** The Z route of a plan between boxes one above the other, laid and recorded as used; undefined when none fits. */
function zOf(
  r: Routed,
  plan: Plan,
  port: (r: PortRequest) => Point,
  board: Board,
  used: Point[][],
  gap: number,
): Routed | undefined {
  const own = new Set([plan.a.id, plan.b.id]);
  const blocks = board.nodes.filter((n) => !own.has(n.id)).map((n) => n.rect);
  const points = zRoute(port(plan.from), port(plan.to), [plan.from.side, plan.to.side], blocks, used, gap);
  if (!points) return undefined;
  used.push(points);
  return { ...r, fromSide: plan.from.side, toSide: plan.to.side, points, shape: 'orthogonal' };
}

/** What the path search avoids: nodes, head strips and the routes laid so far, which it extends. */
interface Room {
  readonly obstacles: readonly Rect[];
  readonly headers: readonly Rect[];
  readonly used: Point[][];
  readonly gap: number;
}

function searched(
  r: Routed,
  plan: Plan,
  plans: readonly (Plan | undefined)[],
  port: (r: PortRequest) => Point,
  board: Board,
  room: Room,
): Routed {
  const { a, b } = plan;
  const { obstacles, headers, used, gap } = room;
  const fromSide = plan.from.side;
  const toSide = plan.to.side;
  const start = port(plan.from);
  const end = port(plan.to);
  const ownHeaders = new Set([a.id, b.id]);
  const blocks = [
    ...obstacles,
    ...headers.filter((_, i) => !ownHeaders.has(groupKey((board.layout.groups[i] as { id: string }).id))),
    ...(r.edge.avoid ?? []),
  ];
  const startStub = offset(start, fromSide, gap);
  const endStub = offset(end, toSide, gap);
  const peers = plans
    .filter((p): p is Plan => p !== undefined && p.b.id === b.id && p.to.side === 'bottom')
    .sort((p, q) => cx(q.a.rect) - cx(p.a.rect));
  const lane = peers.indexOf(plan) + 1;
  const waypoint: Point = [end[0], Math.max(...obstacles.map(bottom)) + gap * lane];
  const via = toSide === 'bottom' && peers.length > 1 ? waypoint : endStub;
  const first = searchPath(startStub, via, blocks, used, gap);
  const tail = via === endStub ? [] : searchPath(via, endStub, blocks, used, gap);
  const middle = first && tail ? [...first, ...tail] : undefined;
  if (!middle) return { ...r, unroutable: true };
  const points = simplify([start, ...middle, end]);
  used.push(points);
  return { ...r, fromSide, toSide, points, shape: points.length === 2 ? 'straight' : 'orthogonal' };
}

/** Length plus a heavy penalty per crossing and per overlap of routes outside a shared bundle. */
function score(routes: readonly Routed[]): number {
  let value = routes.reduce((sum, r) => sum + polylineLength(r.points), 0);
  for (const [i, a] of routes.entries())
    for (const b of routes.slice(i + 1)) {
      if (a.edge.bundle && a.edge.bundle === b.edge.bundle) continue;
      for (let j = 1; j < a.points.length; j++)
        for (let k = 1; k < b.points.length; k++) {
          const p = a.points[j - 1] as Point;
          const q = a.points[j] as Point;
          const r = b.points[k - 1] as Point;
          const s = b.points[k] as Point;
          if (segmentsCross(p, q, r, s)) value += 100000;
          const h = p[1] === q[1];
          const axis = h ? 0 : 1;
          if (h === (r[1] === s[1]) && p[h ? 1 : 0] === r[h ? 1 : 0]) {
            const overlap =
              Math.min(Math.max(p[axis], q[axis]), Math.max(r[axis], s[axis])) -
              Math.max(Math.min(p[axis], q[axis]), Math.min(r[axis], s[axis]));
            if (overlap > 1) value += 100000 + overlap;
          }
        }
    }
  return value;
}

/**
 * Routes of an adaptive grid: six fixed attempts (forward and backward, three ways for long edges) instead of an
 * open search; the best score wins, the earlier attempt on a tie. Edges no attempt could route weigh most.
 */
export function adaptiveRoutes(routes: readonly Routed[], board: Board): Routed[] {
  let best: { routes: Routed[]; score: number } | undefined;
  for (const reverse of [false, true])
    for (const mode of [0, 1, 2]) {
      const input = reverse ? [...routes].reverse() : [...routes];
      const result = routeAttempt(input, board, mode, (reverse ? 3 : 0) + mode);
      const candidate = reverse ? result.reverse() : result;
      const cost = score(candidate) + candidate.filter((r) => r.unroutable).length * 10000000;
      if (!best || cost < best.score) best = { routes: candidate, score: cost };
    }
  return best?.routes ?? [...routes];
}
