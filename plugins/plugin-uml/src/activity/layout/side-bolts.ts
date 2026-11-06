import type { Point, Rect } from '@diagrist/core';
import { type Graph, type GraphFlow, isHandlerFlow } from './graph.js';
import type { Laid } from './laid.js';
import { ACT, SIZE } from './metrics.js';
import { SIDE_PIN_SLOT } from './pin-docks.js';
import type { Routed } from './placement.js';

/** The bolts into a handler after its first, which the engine would run on a rail round the handler. */
function laterBolts(g: Graph): Set<GraphFlow> {
  const bolted = new Set<string>();
  const later = new Set<GraphFlow>();
  for (const f of g.flows) {
    if (!isHandlerFlow(f)) continue;
    if (bolted.has(f.to)) later.add(f);
    bolted.add(f.to);
  }
  return later;
}

/**
 * The height a handler takes for the exception pins of its bolts drawn by the kind (`GraphFlow.held`) below the one
 * of its first bolt, which comes in at its middle: a slot for each from there down, at least `h`.
 */
export function heldHeight(g: Graph, id: string, h: number): number {
  const held = g.flows.filter((f) => f.held === true && f.to === id).length;
  return held === 0 ? h : Math.max(h, 2 * (held * SIDE_PIN_SLOT + ACT.pinGap + ACT.pin / 2));
}

/**
 * A bolt from the side of protected action `p` facing handler `h` into the facing side of `h`: straight where the
 * middle of `p` meets that side where an exception pin may stand, else across at half way and up or down to it.
 */
function sideRoute(flow: GraphFlow, p: Rect, h: Rect): Routed | undefined {
  const right = h.x >= p.x + p.w;
  if (!right && h.x + h.w > p.x) return undefined;
  const [x0, x1] = right ? [p.x + p.w, h.x] : [p.x, h.x + h.w];
  const y0 = p.y + p.h / 2;
  const [lo, hi] = [h.y + SIZE.label + ACT.pinGap + ACT.pin / 2, h.y + h.h - ACT.pinGap - ACT.pin / 2];
  const y1 = Math.min(hi, Math.max(lo, y0));
  if (Math.abs(x1 - x0) < 6 * ACT.bolt + ACT.pin) return undefined;
  const xm = (x0 + x1) / 2;
  const points: Point[] =
    y1 === y0
      ? [
          [x0, y0],
          [x1, y0],
        ]
      : [
          [x0, y0],
          [xm, y0],
          [xm, y1],
          [x1, y1],
        ];
  return { flow, points, fromSide: right ? 'right' : 'left', toSide: right ? 'left' : 'right' };
}

/** Does the piece from `a` to `b` pass through the inside of `r`? */
function through(a: Point, b: Point, r: Rect): boolean {
  return (
    Math.min(a[0], b[0]) < r.x + r.w &&
    Math.max(a[0], b[0]) > r.x &&
    Math.min(a[1], b[1]) < r.y + r.h &&
    Math.max(a[1], b[1]) > r.y
  );
}

/** Do two axis-parallel pieces cross or touch? */
function meets(a: Point, b: Point, c: Point, d: Point): boolean {
  const overlap = (k: 0 | 1) =>
    Math.min(a[k], b[k]) <= Math.max(c[k], d[k]) && Math.min(c[k], d[k]) <= Math.max(a[k], b[k]);
  return overlap(0) && overlap(1);
}

/** Whether a route passes no box but its own two and meets no other route. */
function clear(route: Routed, laid: Laid, others: readonly Routed[]): boolean {
  const pieces = route.points.slice(1).map((b, k) => [route.points[k] as Point, b] as const);
  const boxes = [...laid.nodes.values()].filter((n) => n.id !== route.flow.from && n.id !== route.flow.to);
  if (pieces.some(([a, b]) => boxes.some((n) => through(a, b, n.rect)))) return false;
  return others.every((o) =>
    o.points.slice(1).every((d, k) => pieces.every(([a, b]) => !meets(a, b, o.points[k] as Point, d))),
  );
}

/**
 * An activity laid out with every bolt into a handler after its first running from the side of its protected action
 * into the side of the handler that faces it, where its first bolt comes in, so the exception pins stand below each
 * other (UML 2.5.1, 15.5.3.1): the picture is laid out without those bolts, each then drawn across at half way between
 * the two. Where one would pass a box or meet another line, or the handler stands above or below its action, there is
 * none and the engine runs them on rails (`undefined`).
 */
export function sideBolts(g: Graph, lay: (g: Graph) => Laid): Laid | undefined {
  const later = laterBolts(g);
  if (later.size === 0) return undefined;
  const laid = lay({ ...g, flows: g.flows.map((f) => (later.has(f) ? { ...f, held: true } : f)) });
  const added: Routed[] = [];
  for (const flow of later) {
    const [p, h] = [laid.nodes.get(flow.from)?.rect, laid.nodes.get(flow.to)?.rect];
    const route = p && h ? sideRoute(flow, p, h) : undefined;
    if (!route || !clear(route, laid, [...laid.routes, ...added])) return undefined;
    added.push(route);
  }
  const byFlow = new Map([...laid.routes, ...added].map((r) => [r.flow.index, r]));
  const routes = g.flows.flatMap((f) => byFlow.get(f.index) ?? []);
  const at = new Map(routes.map((r, k) => [r.flow.index, k]));
  const guards = laid.guards.map((t) => ({ ...t, route: at.get(laid.routes[t.route]?.flow.index ?? -1) ?? t.route }));
  return { ...laid, routes, guards };
}
