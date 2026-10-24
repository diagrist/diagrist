import type { GridEdge, GridLayout, GridNode, GridSpec, Route } from '@diagrist/layout-grid';
import { routeEdges } from '@diagrist/layout-grid';
import type { StateModel } from '../../model.js';
import { endBox, foreignFrames } from '../ends.js';
import { labelLines } from '../labels.js';
import { transitionSides } from '../sides.js';
import { edgeId } from '../spec.js';
import type { RouteContext } from './context.js';
import { type Loop, placeLoops, stateLoop } from './loops.js';
import { spreadRails } from './rails.js';
import { centreSteps, cornerSteps } from './steps.js';

/** The routes of a state machine and what belongs to them by index. */
export interface Routing {
  /** The spec the routes were laid on: the grid's nodes with the border points added. */
  readonly spec: GridSpec;
  readonly routes: readonly Route[];
  readonly context: RouteContext;
}

/** Nodes the grid did not place but the router has to know: entry and exit points, in their grid cell. */
function pointNodes(spec: GridSpec, grid: GridLayout): GridNode[] {
  const known = new Set(spec.nodes.map((n) => n.id));
  return grid.nodes.flatMap((n): GridNode[] => {
    const [col, row] = [grid.cols[n.col]?.name, grid.rows[n.row]?.name];
    return known.has(n.id) || !col || !row
      ? []
      : [{ id: n.id, col, row, width: n.rect.w, height: n.rect.h, shape: 'box' }];
  });
}

const tidy = (routes: readonly Route[], c: RouteContext) => cornerSteps(centreSteps(spreadRails(routes, c), c), c);

/**
 * Routes of a state machine on `layout-grid`: the kind chooses the sides of each transition per attempt, keeps
 * frames of foreign states out of its way and lays loops itself; the grid searches the ways. A first pass shows where
 * other lines dock; then each loop moves to the freest corner of its state and the router lays the rest around it.
 * Rails, steps and corners are tidied after each pass.
 */
export function routeStates(m: StateModel, spec: GridSpec, grid: GridLayout): Routing {
  const items = m.diagram.transitions.flatMap((t, i) => {
    const [a, b] = [endBox(t.from, grid), endBox(t.to, grid)];
    return a && b ? [{ t, i, a, b }] : [];
  });
  const loops = new Map(items.flatMap((x, k) => (x.t.from === x.t.to ? [[k, x.t.from] as const] : [])));
  const edges = (laid: ReadonlyMap<number, Loop>): GridEdge[] =>
    items.map(({ t, i, a, b }, k) => {
      const loop = t.from === t.to ? (laid.get(k) ?? stateLoop(a.rect)) : undefined;
      return {
        id: edgeId(i),
        from: t.from,
        to: t.to,
        ...(loop
          ? { route: loop }
          : {
              sides: [k, items.length - 1 - k].flatMap((index) =>
                [0, 1, 2].map((mode) => transitionSides(m, a, b, mode, index, grid)),
              ),
              avoid: foreignFrames(m, t.from, t.to, grid),
            }),
        source: t.span,
      };
    });
  const context: RouteContext = {
    m,
    grid,
    ends: items.map(({ t }) => ({ from: t.from, to: t.to, ...(t.emph ? { emph: true } : {}) })),
    lines: items.map(({ t }) => labelLines(t, m.diagram.protocol)),
  };
  const nodes = [...spec.nodes, ...pointNodes(spec, grid)];
  const run = (laid: ReadonlyMap<number, Loop>) => {
    const routed = { ...spec, nodes, edges: edges(laid) };
    return { spec: routed, routes: tidy(routeEdges(routed, grid), context) };
  };
  const first = run(new Map());
  if (!loops.size) return { ...first, context };
  return { ...run(placeLoops(first.routes, loops, grid)), context };
}
