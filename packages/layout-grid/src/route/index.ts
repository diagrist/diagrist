import type { GridLayout, Route } from '../layout.js';
import type { GridSpec } from '../spec.js';
import { adaptiveRoutes } from './adaptive.js';
import { boardOf } from './boxes.js';
import { gridRoutes } from './grid.js';
import { toRoute } from './routed.js';
import { insetLaneEnds, snapToOutlines } from './snap.js';
import { straightRoutes } from './straight.js';

/**
 * Routes every edge whose ends were placed, in the order of the edges. A fixed grid picks straight, L or Z shapes
 * and spreads the ports per side; an adaptive one then searches orthogonal ways around nodes and head strips, laying
 * bundles as trunks. Ends at circles and ellipses lie on the outline. With straight lines each edge runs from
 * outline to outline.
 */
export function routeEdges(spec: GridSpec, layout: GridLayout): Route[] {
  const board = boardOf(spec, layout);
  if (spec.lines === 'straight') return straightRoutes(board).map(toRoute);
  const routed = gridRoutes(board);
  const done = spec.adaptive ? adaptiveRoutes(routed, board) : routed;
  return snapToOutlines(insetLaneEnds(done, spec.metrics.nodeH / 2), board).map(toRoute);
}
