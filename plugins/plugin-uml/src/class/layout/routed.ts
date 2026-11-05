import type { Rect } from '@diagrist/core';
import {
  type EdgeLabel,
  type GridLayout,
  type LayeredLayout,
  layoutLayered,
  linesOfLaid,
  type Route,
  type Score,
  scoreOf,
} from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import type { Cell } from './blocks.js';
import { classCells } from './cells.js';
import { legsAtVertices } from './extras.js';
import { classLayered, edgeId } from './layered.js';
import { CLASS } from './metrics.js';
import { packageLine } from './package-lines.js';

/** The boxes and frames of a class diagram with its lines drawn and the names the pipeline seated. */
export interface Routed {
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  /** The relation of each route, by route index. */
  readonly relations: readonly (ClassRelation | undefined)[];
  /** Names seated beside the start of their line, by route index. */
  readonly labels: readonly EdgeLabel[];
  /** Edges drawn on a common trunk, by edge id. */
  readonly trunks: ReadonlyMap<string, string>;
}

/** A loop at the right side of a class: out to the right, down below the class and back into its bottom. */
function loop(r: Rect, reach: number): Route {
  const [right, bottom] = [r.x + r.w, r.y + r.h];
  const start: [number, number] = [right, r.y + Math.min(r.h / 2, 24)];
  const end: [number, number] = [right - 24, bottom];
  return {
    edge: '',
    points: [start, [right + reach, start[1]], [right + reach, bottom + reach], [end[0], bottom + reach], end],
    shape: 'loop',
    fromSide: 'right',
    toSide: 'bottom',
  };
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
 * Lays out the cells on the layered pipeline, then draws what it leaves to the kind: lines of a class with itself
 * and lines with a package at an end. Routes come in the order of the relations, legs of a diamond at its vertices.
 */
function routeOn(m: ClassModel, cells: ReadonlyMap<string, Cell>): Routed {
  const layout = layoutLayered(classLayered(m, cells));
  const grid = gridOf(layout);
  const byEdge = new Map(layout.routes.map((r) => [r.edge, r]));
  const rect = (id: string) => (grid.nodes.find((n) => n.id === id) ?? grid.groups.find((g) => g.id === id))?.rect;
  const routes: Route[] = [];
  const relations: ClassRelation[] = [];
  const moved = new Map<number, number>();
  m.diagram.relations.forEach((r, i) => {
    const id = edgeId(i);
    const own = byEdge.get(id);
    const [a, b] = [rect(r.from), rect(r.to)];
    let route = own;
    if (!route && a && r.from === r.to && m.classifiers.has(r.from)) route = { ...loop(a, CLASS.loopReach), edge: id };
    else if (!route && a && b && (m.packages.has(r.from) || m.packages.has(r.to)))
      route = packageLine(id, a, b, m.packages.get(r.to)?.label, {
        routes: [...layout.routes, ...routes],
        grid,
        texts: layout.labels.map((l) => l.box),
      });
    if (!route) return;
    if (own) moved.set(layout.routes.indexOf(own), routes.length);
    routes.push(route);
    relations.push(r);
  });
  const labels = layout.labels.flatMap((l) => {
    const at = moved.get(l.route);
    return at === undefined ? [] : [{ ...l, route: at }];
  });
  return { grid, routes: legsAtVertices(routes, relations, m, grid), relations, labels, trunks: layout.trunks };
}

/** What speaks against a trial by `scoreOf`, and whether nothing hard does: no line through a box or across another. */
function judge(t: Routed): Score {
  return scoreOf(
    linesOfLaid({
      nodes: t.grid.nodes,
      routes: t.routes,
      ends: t.relations.map((r) => [r?.from ?? '', r?.to ?? '']),
      labels: t.labels,
      frames: t.grid.groups,
      width: t.grid.width,
      height: t.grid.bottom,
    }),
  );
}

/**
 * The boxes and lines of a class diagram. With many packages on the top level the arrangements of the search are
 * laid out in turn: the first without a line through a box and without crossings stays, since every trial costs a
 * layout, else the cheapest by `scoreOf`.
 */
export function routeClass(m: ClassModel): Routed {
  const [first = new Map(), ...others] = classCells(m);
  const start = routeOn(m, first);
  if (!others.length) return start;
  let best = { ...start, ...judge(start) };
  for (const cells of others) {
    if (best.clean) break;
    const trial = routeOn(m, cells);
    const verdict = judge(trial);
    if (verdict.cost < best.cost) best = { ...trial, ...verdict };
  }
  return best;
}
