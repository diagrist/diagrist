import { type EdgeLabel, type GridLayout, type LayeredLayout, layoutGraph, type Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { legsAtVertices } from './extras.js';
import { classGraph, edgeId } from './layered.js';

/** The boxes and frames of a class diagram with its lines drawn and the names the pipeline seated. */
export interface Routed {
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  /** The relation of each route, by route index. */
  readonly relations: readonly (ClassRelation | undefined)[];
  /** The names of the lines where the spot search of the pipeline put them, by route index. */
  readonly labels: readonly EdgeLabel[];
  /** Edges drawn on a common trunk, by edge id. */
  readonly trunks: ReadonlyMap<string, string>;
}

/** The picture of a layout: its boxes as nodes, its frames as groups, its size. */
const gridOf = (layout: LayeredLayout): GridLayout => ({
  cols: [],
  rows: [],
  gutters: { cols: [], rows: [] },
  nodes: layout.nodes,
  groups: layout.frames ?? [],
  width: layout.width,
  bottom: layout.bottom,
});

/**
 * Lays out a class diagram on the layered pipeline: boxes, frames, every line, loops and lines with a package at an
 * end among them, and the names it seated. Routes come in the order of the relations, legs of a diamond at its
 * vertices.
 */
export function routeClass(m: ClassModel): Routed {
  const layout = layoutGraph(classGraph(m));
  const grid = gridOf(layout);
  const byEdge = new Map(layout.routes.map((r) => [r.edge, r]));
  const routes: Route[] = [];
  const relations: ClassRelation[] = [];
  const moved = new Map<number, number>();
  m.diagram.relations.forEach((r, i) => {
    const id = edgeId(i);
    const route = byEdge.get(id);
    if (!route) return;
    moved.set(layout.routes.indexOf(route), routes.length);
    routes.push(route);
    relations.push(r);
  });
  const labels = layout.labels.flatMap((l) => {
    const at = moved.get(l.route);
    return at === undefined ? [] : [{ ...l, route: at }];
  });
  return { grid, routes: legsAtVertices(routes, relations, m, grid), relations, labels, trunks: layout.trunks };
}
