import type { Placed, Rect } from '@diagrist/core';
import { bottom, right } from './geometry.js';
import type { EdgeLabel } from './label/types.js';
import type { GridLayout, Route } from './layout.js';
import { homeOf, type Tree, treeOf } from './place/extent.js';
import type { GridSpec } from './spec.js';

/** Something a kind drew on a route besides its texts, such as the number of a step, and the rectangle it covers. */
export interface RouteMark {
  /** Index of the route. */
  readonly route: number;
  readonly rect: Rect;
}

/**
 * What the grid placed, for the kernel's placement check (ADR 0010): frames and nodes as boxes inside their frames,
 * ellipses and circles (whose rectangle is their square) with their outline, labels as texts keyed
 * `<edge>.label.<n>` inside the innermost frame holding both ends of their edge, which `fitFrames` grows around
 * them, and marks on routes as texts keyed `<edge>.number`. A mark sits near the start of its edge, so it belongs to
 * the innermost frame around the start that holds it, else to the frame of both ends. Spans come from the spec.
 */
export function placedOf(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[] = [],
  labels: readonly EdgeLabel[] = [],
  marks: readonly RouteMark[] = [],
): Placed[] {
  const tree = treeOf(spec);
  const span = (source: Placed['span']) => (source ? { span: source } : {});
  const within = (id: string | undefined) =>
    id !== undefined && layout.groups.some((g) => g.id === id) ? { within: id } : {};
  const groups = layout.groups.map((g): Placed => {
    const model = tree.group(g.id);
    return { key: g.id, kind: 'box', rect: g.rect, ...within(model?.parent), ...span(model?.source) };
  });
  const nodes = layout.nodes.map((n): Placed => {
    const home = homeOf(tree, n.id);
    const model = tree.node(n.id);
    const outline = model?.shape === 'ellipse' || model?.shape === 'circle' ? { outline: 'ellipse' as const } : {};
    return { key: n.id, kind: 'box', rect: n.rect, ...outline, ...within(home?.id), ...span(model?.source) };
  });
  const counts = new Map<string, number>();
  const texts = labels.flatMap((l): Placed[] => {
    const edge = routes[l.route]?.edge;
    if (edge === undefined) return [];
    const n = (counts.get(edge) ?? 0) + 1;
    counts.set(edge, n);
    const e = spec.edges.find((x) => x.id === edge);
    const frame = e && sharedFrame(tree, e.from, e.to);
    return [{ key: `${edge}.label.${n}`, kind: 'text', rect: l.box, ...within(frame), ...span(e?.source) }];
  });
  const holds = (id: string, r: Rect) => {
    const g = layout.groups.find((x) => x.id === id)?.rect;
    return g !== undefined && r.x >= g.x && r.y >= g.y && right(r) <= right(g) && bottom(r) <= bottom(g);
  };
  const numbers = marks.flatMap((m): Placed[] => {
    const edge = routes[m.route]?.edge;
    const e = spec.edges.find((x) => x.id === edge);
    if (edge === undefined || !e) return [];
    const frame = framesAround(tree, e.from).find((id) => holds(id, m.rect)) ?? sharedFrame(tree, e.from, e.to);
    return [{ key: `${edge}.number`, kind: 'text', rect: m.rect, ...within(frame), ...span(e.source) }];
  });
  return [...groups, ...nodes, ...texts, ...numbers];
}

/** Frames around an end, innermost first: the node's frame and its parents, or the frame itself and its parents. */
function framesAround(tree: Tree, end: string): string[] {
  const out: string[] = [];
  let g = tree.node(end) ? homeOf(tree, end) : tree.group(end);
  while (g && !out.includes(g.id)) {
    out.push(g.id);
    g = g.parent === undefined ? undefined : tree.group(g.parent);
  }
  return out;
}

function sharedFrame(tree: Tree, from: string, to: string): string | undefined {
  const outer = framesAround(tree, to);
  return framesAround(tree, from).find((id) => outer.includes(id));
}
