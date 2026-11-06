import type { Placed, Point, Rect } from '@diagrist/core';
import { bottom, right, type Side } from '../geometry.js';
import type { EdgeLabel } from '../label/types.js';
import type { LayeredLayout } from '../layered/output.js';
import type { LayeredSpec } from '../layered/spec.js';
import type { PlacedNode, Route } from '../layout.js';
import { respotTexts } from './dock-texts.js';
import type { DockPlan } from './docks.js';
import type { LayoutGraph } from './spec.js';

/** Is the point inside the rectangle, more than half a pixel from its outline? */
const within = (p: Point, r: Rect) =>
  p[0] > r.x + 0.5 && p[0] < right(r) - 0.5 && p[1] > r.y + 0.5 && p[1] < bottom(r) - 0.5;

/** The side of a circle a line reaches it on, coming from `p` towards `q`. */
const sideInto = (p: Point, q: Point): Side =>
  p[0] === q[0] ? (q[1] > p[1] ? 'top' : 'bottom') : q[0] > p[0] ? 'left' : 'right';

/** `q` moved by `d` towards `p` along their axis. */
const back = (p: Point, q: Point, d: number): Point => {
  const [dx, dy] = [Math.sign(p[0] - q[0]), Math.sign(p[1] - q[1])];
  return [q[0] + dx * d, q[1] + dy * d];
};

/** Where the route first crosses the outline `r`, and the index of the piece it crosses on. */
function crossing(points: readonly Point[], r: Rect): { readonly at: Point; readonly piece: number } | undefined {
  for (let k = 0; k + 1 < points.length; k++) {
    const [p, q] = [points[k] as Point, points[k + 1] as Point];
    if (within(p, r) === within(q, r)) continue;
    if (p[0] === q[0]) {
      const y = Math.min(p[1], q[1]) <= r.y && Math.max(p[1], q[1]) >= r.y ? r.y : bottom(r);
      return { at: [p[0], y], piece: k };
    }
    const x = Math.min(p[0], q[0]) <= r.x && Math.max(p[0], q[0]) >= r.x ? r.x : right(r);
    return { at: [x, p[1]], piece: k };
  }
  return undefined;
}

/** A route from its points, its sides read from its first and last pieces. */
function routeOf(edge: string, points: readonly Point[], fromSide: Side): Route {
  const n = points.length;
  const toSide = n > 1 ? sideInto(points[n - 2] as Point, points[n - 1] as Point) : 'top';
  return { edge, points, shape: 'orthogonal', fromSide, toSide };
}

/**
 * The docked nodes of `dockGraph` placed on their outlines and the lines laid out for them cut back apart: a line
 * through one splits where it crosses the outline, its two parts ending and starting a radius from the middle of
 * the node; a line to a host ends where the docked node now stands; a docked node beside its partner inside a frame
 * moves out along its line to the frame's side. A docked node no line reaches sits at the top of its host near the
 * right. The routes come in the order of the graph's edges, each text with the part it belongs to, the texts of a line
 * that was cut seated at their own parts (`respotTexts`).
 */
export function placeDocks(
  graph: LayoutGraph,
  plan: DockPlan,
  layout: LayeredLayout,
  specOf: (graph: LayoutGraph) => LayeredSpec,
): LayeredLayout {
  if (plan.docks.size === 0) return layout;
  const rects = new Map<string, Rect>([
    ...(layout.frames ?? []).map((f) => [f.id, f.rect] as const),
    ...layout.nodes.map((n) => [n.id, n.rect] as const),
  ]);
  const centres = new Map<string, Point>();
  const out = new Map<string, Route>();
  const labelOf = new Map<number, string>();
  const put = (dock: string, at: Point) => {
    if (!centres.has(dock)) centres.set(dock, at);
  };
  const half = (dock: string) => (plan.docks.get(dock)?.node.width ?? 0) / 2;
  layout.routes.forEach((route, k) => {
    const pts = route.points;
    const through = plan.merged.get(route.edge);
    const beside = plan.beside.get(route.edge);
    if (through !== undefined) {
      const box = rects.get(plan.docks.get(through.dock)?.host ?? '');
      const cut = box === undefined ? undefined : crossing(pts, box);
      const at = cut?.at ?? (pts[0] as Point);
      const piece = cut?.piece ?? 0;
      const r = half(through.dock);
      put(through.dock, at);
      const [p, q] = [pts[piece] as Point, pts[piece + 1] as Point];
      if (!out.has(through.into.id))
        out.set(
          through.into.id,
          routeOf(through.into.id, [...pts.slice(0, piece + 1), back(p, at, r)], route.fromSide),
        );
      const start = back(q, at, r);
      out.set(through.out.id, routeOf(through.out.id, [start, ...pts.slice(piece + 1)], sideInto(q, at)));
      labelOf.set(k, through.into.label ? through.into.id : through.out.id);
      return;
    }
    labelOf.set(k, route.edge);
    const e = beside === undefined ? undefined : graph.edges.find((x) => x.id === route.edge);
    const frame = beside === undefined ? undefined : rects.get(plan.docks.get(beside)?.host ?? '');
    const own = beside === undefined ? undefined : rects.get(beside);
    const first = e?.from === beside;
    const [end, next] = first ? [pts[0], pts[1]] : [pts.at(-1), pts.at(-2)];
    if (beside === undefined || frame === undefined || own === undefined || !end || !next || end[1] !== next[1]) {
      if (beside !== undefined && own !== undefined) put(beside, [own.x + own.w / 2, own.y + own.h / 2]);
      out.set(route.edge, route);
      return;
    }
    const x = next[0] > end[0] ? frame.x : right(frame);
    const r = half(beside);
    put(beside, [x, end[1]]);
    const moved: Point = [x + Math.sign(next[0] - x) * r, end[1]];
    out.set(route.edge, { ...route, points: first ? [moved, ...pts.slice(1)] : [...pts.slice(0, -1), moved] });
  });
  for (const [edge, ends] of plan.hosted) {
    const route = out.get(edge);
    if (route === undefined) continue;
    let pts = [...route.points];
    for (const [end, dock] of [
      ['to', ends.to],
      ['from', ends.from],
    ] as const) {
      if (dock === undefined) continue;
      const ordered = end === 'to' ? pts : [...pts].reverse();
      const at = ordered.at(-1) as Point;
      put(dock, at);
      const cut = [...ordered.slice(0, -1), back(ordered.at(-2) ?? at, at, half(dock))];
      pts = end === 'to' ? cut : cut.reverse();
    }
    out.set(edge, { ...route, points: pts });
  }
  for (const [id, d] of plan.docks) {
    const host = rects.get(d.host);
    if (!centres.has(id) && host) put(id, [right(host) - 2 * d.node.width, host.y]);
  }
  const routes = graph.edges.flatMap((e) => out.get(e.id) ?? []);
  const index = new Map(routes.map((r, i) => [r.edge, i]));
  const moved = layout.labels.map((l): EdgeLabel => ({ ...l, route: index.get(labelOf.get(l.route) ?? '') ?? 0 }));
  const twins = new Map(
    [...plan.merged.values()].flatMap((t) => [[t.into.id, t.out.id] as const, [t.out.id, t.into.id] as const]),
  );
  const cut = new Map(
    routes.flatMap((r, i) => {
      const twin = index.get(twins.get(r.edge) ?? '');
      return twin === undefined ? [] : [[i, twin] as const];
    }),
  );
  const docked = [...centres].flatMap(([id, [x, y]]): PlacedNode[] => {
    const n = plan.docks.get(id)?.node;
    return n
      ? [{ id, rect: { x: x - n.width / 2, y: y - n.height / 2, w: n.width, h: n.height }, col: 0, row: 0 }]
      : [];
  });
  const nodes = [...layout.nodes.filter((n) => !plan.docks.has(n.id)), ...docked];
  const labels = respotTexts(specOf(graph), { routes, nodes, frames: layout.frames ?? [] }, moved, cut);
  const placed: Placed[] = [
    ...layout.placed.filter((p) => p.kind !== 'text' && !plan.docks.has(p.key)),
    ...docked.map((n): Placed => ({ key: n.id, kind: 'box', rect: n.rect })),
    ...labels.map((l, i): Placed => {
      const edge = routes[l.route]?.edge ?? '';
      const n = labels.slice(0, i).filter((k) => k.route === l.route).length + 1;
      return { key: `${edge}.label.${n}`, kind: 'text', rect: l.box };
    }),
  ];
  return { ...layout, nodes, routes, labels, placed };
}
