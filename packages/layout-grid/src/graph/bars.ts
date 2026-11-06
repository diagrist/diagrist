import type { Point, Rect } from '@diagrist/core';
import { bottom, overlaps, right } from '../geometry.js';
import type { LayeredLayout } from '../layered/output.js';
import type { PlacedNode, Route } from '../layout.js';
import type { LayoutGraph } from './spec.js';

/** How far a bar reaches past the outermost line that leaves or enters it. */
const OVERHANG = 24;

/**
 * A line out of the bottom or into the top of a bar, its jog in the gap next to the bar taken out: it leaves or
 * enters the bar where its next piece runs, straight. The points run from the bar on; a line that does not start with
 * a vertical, a horizontal and a vertical stays.
 */
function straight(points: readonly Point[], at: number, boxes: readonly Rect[]): Point[] {
  const [p0, p1, p2, p3] = points;
  if (p0 === undefined || p1 === undefined || p2 === undefined || p3 === undefined) return [...points];
  const jog = p0[0] === p1[0] && p1[1] === p2[1] && p2[0] === p3[0];
  const run = { x: p2[0] - 1, y: Math.min(at, p2[1]), w: 2, h: Math.abs(at - p2[1]) };
  return jog && !boxes.some((b) => overlaps(run, b)) ? [[p2[0], at], ...points.slice(3)] : [...points];
}

/** The lines of a bar with their jogs next to it taken out, and the span from the outermost of them to the other. */
function spanOf(
  bar: PlacedNode,
  routes: readonly Route[],
  ends: ReadonlyMap<string, LayoutGraph['edges'][number]>,
  boxes: readonly Rect[],
) {
  const r = bar.rect;
  const others = boxes.filter((b) => b !== r);
  const moved = routes.map((route): Route => {
    const e = ends.get(route.edge);
    if (e?.from === bar.id && route.points[0]?.[1] === bottom(r))
      return { ...route, points: straight(route.points, bottom(r), others) };
    if (e?.to === bar.id && route.points.at(-1)?.[1] === r.y)
      return { ...route, points: straight([...route.points].reverse(), r.y, others).reverse() };
    return route;
  });
  const xs = moved.flatMap((route) => {
    const e = ends.get(route.edge);
    const [first, last] = [route.points[0], route.points.at(-1)];
    return [
      ...(e?.from === bar.id && first !== undefined ? [first[0]] : []),
      ...(e?.to === bar.id && last !== undefined ? [last[0]] : []),
    ];
  });
  const lo = Math.min(r.x + OVERHANG, ...xs) - OVERHANG;
  const hi = Math.max(right(r) - OVERHANG, ...xs) + OVERHANG;
  return { moved, rect: { ...r, x: lo, w: hi - lo } satisfies Rect };
}

/**
 * The graph laid out once more with every bar as wide as its lines want it (`stretchBars`), where one wants more,
 * so the placement keeps the room free that the bar then takes; undefined where none does. Boxes of the bar's own
 * layer do not stop a line here, the wider bar moves them aside.
 */
export function widenBars(graph: LayoutGraph, layout: LayeredLayout): LayoutGraph | undefined {
  const ends = new Map(graph.edges.map((e) => [e.id, e]));
  const boxes = layout.nodes.map((n) => n.rect);
  const wide = new Map(
    layout.nodes.flatMap((n) => {
      const node = graph.nodes.find((k) => k.id === n.id);
      if (node?.shape !== 'bar') return [];
      const mid = n.rect.y + n.rect.h / 2;
      const apart = boxes.filter((b) => b.y > mid || bottom(b) < mid);
      const w = spanOf(n, layout.routes, ends, apart).rect.w;
      return w > node.width + 1 ? [[n.id, Math.ceil(w)] as const] : [];
    }),
  );
  if (wide.size === 0) return undefined;
  return { ...graph, nodes: graph.nodes.map((n) => ({ ...n, width: wide.get(n.id) ?? n.width })) };
}

/**
 * Nodes of the shape `bar` stretched over their branches (layout plan P8): every line that leaves the bottom of a bar
 * or enters its top runs straight from where its next piece runs, and the bar reaches from the outermost of them to
 * the other, `OVERHANG` beyond, never narrower than laid out. A bar that would then touch another box keeps its
 * width and its lines. Pictures without bars are handed back as they are.
 */
export function stretchBars(graph: LayoutGraph, layout: LayeredLayout): LayeredLayout {
  const bars = new Set(graph.nodes.flatMap((n) => (n.shape === 'bar' ? [n.id] : [])));
  if (bars.size === 0) return layout;
  const ends = new Map(graph.edges.map((e) => [e.id, e]));
  let routes = [...layout.routes];
  let nodes = [...layout.nodes];
  for (const bar of bars) {
    const node = nodes.find((n) => n.id === bar);
    if (node === undefined) continue;
    const { moved, rect } = spanOf(
      node,
      routes,
      ends,
      nodes.map((n) => n.rect),
    );
    if (nodes.some((n) => n.id !== bar && overlaps(rect, n.rect, 4))) continue;
    routes = moved;
    nodes = nodes.map((n) => (n.id === bar ? { ...n, rect } : n));
  }
  const placed = layout.placed.map((p) => {
    const n = bars.has(p.key) ? nodes.find((k) => k.id === p.key) : undefined;
    return n === undefined ? p : { ...p, rect: n.rect };
  });
  return { ...layout, nodes, routes, placed };
}
