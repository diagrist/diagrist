import type { GridLayout, Route } from '../layout.js';
import type { GridSpec } from '../spec.js';
import { adaptiveRoutes } from './adaptive.js';
import { boardOf } from './boxes.js';
import { channelRoutes } from './channel/index.js';
import { gridRoutes } from './grid.js';
import { withLead } from './lead.js';
import { toRoute } from './routed.js';
import { insetLaneEnds, snapToOutlines } from './snap.js';
import { straightRoutes } from './straight.js';

/**
 * Routes every edge whose ends were placed, in the order of the edges. A fixed grid picks straight, L or Z shapes
 * and spreads the ports per side; an adaptive one then searches orthogonal ways around nodes and head strips, laying
 * bundles as trunks. A fixed grid with `channels` routes through its channels instead. Ends at circles and ellipses lie on the outline. With straight lines each edge runs from
 * outline to outline.
 */
export function routeEdges(spec: GridSpec, layout: GridLayout): Route[] {
  const board = boardOf(spec, layout);
  if (spec.lines === 'straight') return straightRoutes(board).map(toRoute);
  if (spec.channels === true && !spec.adaptive)
    return snapToOutlines(insetLaneEnds(channelRoutes(board), spec.metrics.nodeH / 2), board).map(toRoute);
  const routed = gridRoutes(board);
  const adapted = spec.adaptive ? adaptiveRoutes(routed, board) : routed;
  const lead = spec.metrics.lead;
  const done = spec.adaptive && lead !== undefined ? withLead(adapted, board, lead, spec.metrics.laneGap) : adapted;
  return snapToOutlines(insetLaneEnds(done, spec.metrics.nodeH / 2), board).map(toRoute);
}
