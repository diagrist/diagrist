import type { Placed } from '@diagrist/core';
import type { EdgeLabel } from './label/types.js';
import type { GridLayout, Route } from './layout.js';
import { homeOf, type Tree, treeOf } from './place/extent.js';
import type { GridSpec } from './spec.js';

/**
 * What the grid placed, for the kernel's placement check (ADR 0010): frames and nodes as boxes inside their frames,
 * labels as texts keyed `<edge>.label.<n>` inside the innermost frame holding both ends of their edge, which
 * `fitFrames` grows around them. Spans come from the spec.
 */
export function placedOf(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[] = [],
  labels: readonly EdgeLabel[] = [],
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
    return { key: n.id, kind: 'box', rect: n.rect, ...within(home?.id), ...span(tree.node(n.id)?.source) };
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
  return [...groups, ...nodes, ...texts];
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
