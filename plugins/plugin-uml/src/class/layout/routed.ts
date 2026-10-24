import {
  type GridLayout,
  type GridSpec,
  grow,
  placeGrid,
  polylineLength,
  type Route,
  routeEdges,
  segmentMeetsRect,
  segmentsIntersect,
} from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { packagesAround } from '../model.js';
import type { Cell } from './blocks.js';
import { classCells } from './cells.js';
import { belowTabs, legsAtVertices } from './extras.js';
import { clearPackageLines } from './package-lines.js';
import { alignPackages, packageExtents, tabGrowth } from './packages.js';
import { classGridSpec, edgeId } from './spec.js';

/** A grid of a class diagram with its lines drawn. */
export interface Routed {
  readonly spec: GridSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  /** The relation of each route, by route index. */
  readonly relations: readonly (ClassRelation | undefined)[];
}

/** Second runs a class diagram allows itself for packages whose tab a line crosses. */
const GROWTH_PASSES = 3;

/**
 * Weights of a trial: a line without a way or through a foreign class weighs more than any length, a crossing more
 * than a detour, and a bend reads worse than a straight line of the same length.
 */
const WEIGHT = { error: 1000, crossing: 60, pixelsPerPoint: 20, bend: 6 } as const;

/** Places a grid of cells, grows packages whose tab a line crosses, and draws the lines as the scene shows them. */
function routeOn(m: ClassModel, cells: ReadonlyMap<string, Cell>): Routed {
  const extents = packageExtents(m, cells);
  const byEdge = new Map(m.diagram.relations.map((r, i) => [edgeId(i), r]));
  const run = (spec: GridSpec) => {
    const grid = alignPackages(m, spec, placeGrid(spec), extents);
    const routes = routeEdges(spec, grid);
    return { spec, grid, routes, relations: routes.map((r) => byEdge.get(r.edge)) };
  };
  let pass = run(classGridSpec(m, cells));
  for (let i = 0; i < GROWTH_PASSES; i++) {
    const pads = tabGrowth(m, pass.grid, pass.routes, pass.relations);
    if (!pads.size) break;
    pass = run(grow(pass.spec, pads));
  }
  const { grid, relations } = pass;
  const cleared = clearPackageLines(pass.routes, relations, m, grid);
  return { ...pass, routes: legsAtVertices(belowTabs(cleared, relations, m, grid), relations, m, grid) };
}

const segments = (r: Route) => r.points.slice(1).map((q, k) => [r.points[k] ?? q, q] as const);

/** What speaks against a trial, and whether nothing does: no line without a way, through a class or across another. */
function judge(m: ClassModel, t: Routed): { cost: number; clean: boolean } {
  const ownedBy = (id: string, end: string | undefined) => id === end || packagesAround(m, id).some((p) => p === end);
  const errors = t.routes.filter((r, i) => {
    const rel = t.relations[i];
    const foreign = t.grid.nodes.filter((n) => !ownedBy(n.id, rel?.from) && !ownedBy(n.id, rel?.to));
    return r.unroutable || foreign.some((n) => segments(r).some(([p, q]) => segmentMeetsRect(p, q, n.rect, -1)));
  }).length;
  const meet = (a: Route, b: Route) =>
    segments(a).some(([p, q]) => segments(b).some(([u, v]) => segmentsIntersect(p, q, u, v)));
  const crossings = t.routes.reduce((sum, a, i) => sum + t.routes.slice(i + 1).filter((b) => meet(a, b)).length, 0);
  const length = t.routes.reduce((sum, r) => sum + polylineLength(r.points), 0);
  const bends = t.routes.reduce((sum, r) => sum + Math.max(0, r.points.length - 2), 0);
  const cost =
    WEIGHT.error * errors + WEIGHT.crossing * crossings + length / WEIGHT.pixelsPerPoint + WEIGHT.bend * bends;
  return { cost, clean: errors + crossings === 0 };
}

/**
 * The grid and lines of a class diagram. With many packages on the top level the arrangements of the search are laid
 * out in turn: the first without errors and crossings stays, since every trial costs a layout, else the cheapest.
 */
export function routeClass(m: ClassModel): Routed {
  const [first = new Map(), ...others] = classCells(m);
  const start = routeOn(m, first);
  if (!others.length) return start;
  let best = { ...start, ...judge(m, start) };
  for (const cells of others) {
    if (best.clean) break;
    const trial = routeOn(m, cells);
    const verdict = judge(m, trial);
    if (verdict.cost < best.cost) best = { ...trial, ...verdict };
  }
  return best;
}
