import type { Rect } from '@diagrist/core';
import { bottom, right, union } from '../geometry.js';
import type { GridLayout, PlacedGroup, Route } from '../layout.js';
import type { GridGroup, GridSpec } from '../spec.js';
import { depth, innerGroups, isWithin, type Tree, treeOf } from './extent.js';

/** What `fitFrames` needs of a label: the route it belongs to and its box. */
export interface RouteLabel {
  readonly route: number;
  readonly box: Rect;
}

/**
 * Lets frames of an adaptive grid grow around the routes between their own nodes and the labels on them, and
 * parents around grown children. Width and bottom then include all routes and labels. Call it after routing and
 * labelling; the routes stay as they are.
 */
export function fitFrames(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  labels: readonly RouteLabel[],
): GridLayout {
  const tree = treeOf(spec);
  const m = spec.metrics;
  const edges = new Map(spec.edges.map((e) => [e.id, e]));
  const fitted = layout.groups.map((g): PlacedGroup => {
    const model = tree.group(g.id);
    if (!model) return g;
    const members = new Set(innerGroups(tree, model).flatMap((c) => c.members));
    const inside = (end: string): boolean => {
      if (tree.node(end)) return members.has(end);
      const group = tree.group(end);
      return group !== undefined && group !== model && isWithin(tree, group, model);
    };
    const internal = routes.flatMap((r, i) => {
      const e = edges.get(r.edge);
      return e && inside(e.from) && inside(e.to) ? [i] : [];
    });
    const rects: Rect[] = internal.flatMap((i) => (routes[i] as Route).points.map(([x, y]) => ({ x, y, w: 0, h: 0 })));
    rects.push(...labels.filter((l) => internal.includes(l.route)).map((l) => l.box));
    if (!rects.length) return g;
    const content = union(rects);
    const x = Math.min(g.rect.x, content.x - m.framePad.x);
    return {
      ...g,
      rect: {
        ...g.rect,
        x,
        w: Math.max(right(g.rect), right(content) + m.framePad.x) - x,
        h: Math.max(bottom(g.rect), bottom(content) + m.framePad.bottom) - g.rect.y,
      },
    };
  });
  const groups = enclose(fitted, tree);
  const points = routes.flatMap((r) => r.points);
  return {
    ...layout,
    groups,
    width: Math.max(
      layout.width,
      ...groups.map((g) => right(g.rect) + m.marginX),
      ...points.map(([x]) => x + m.marginX),
      ...labels.map((l) => right(l.box) + m.marginX),
    ),
    bottom: Math.max(
      layout.bottom,
      ...groups.map((g) => bottom(g.rect)),
      ...points.map(([, y]) => y + m.margin),
      ...labels.map((l) => bottom(l.box) + m.margin),
    ),
  };
}

function enclose(groups: readonly PlacedGroup[], tree: Tree): PlacedGroup[] {
  const pad = tree.spec.metrics.framePad;
  const rects = new Map<string, Rect>(groups.map((g) => [g.id, g.rect]));
  const modelOf = (g: PlacedGroup): GridGroup | undefined => tree.group(g.id);
  const level = (g: PlacedGroup): number => {
    const model = modelOf(g);
    return model ? depth(tree, model) : 0;
  };
  for (const g of [...groups].sort((a, b) => level(b) - level(a))) {
    const parentId = modelOf(g)?.parent;
    const parent = parentId === undefined ? undefined : rects.get(parentId);
    const child = rects.get(g.id);
    if (parentId === undefined || !parent || !child) continue;
    const x = Math.min(parent.x, child.x - pad.x);
    rects.set(parentId, {
      x,
      y: parent.y,
      w: Math.max(right(parent), right(child) + pad.x) - x,
      h: Math.max(bottom(parent), bottom(child) + pad.bottom) - parent.y,
    });
  }
  return groups.map((g) => ({ ...g, rect: rects.get(g.id) ?? g.rect }));
}
