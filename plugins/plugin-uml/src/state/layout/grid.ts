import { type EdgeLabel, fitFrames, type Pads, placeGrid, placeLabels, type Route } from '@diagrist/layout-grid';
import type { StateModel } from '../model.js';
import { stretchBars } from './bars.js';
import { stateCells } from './cells.js';
import { frameGrowth } from './growth.js';
import { rightTwins, transitionTexts } from './labels.js';
import type { Laid } from './laid.js';
import { STATE as S } from './metrics.js';
import { placeBorderPoints } from './points/index.js';
import { routeStates } from './route/index.js';
import { stateGridSpec } from './spec.js';

/** Second runs for frames that grow around their border points, and for room left of rails. */
const PASSES = 3;

/** More left margin, so rails and their labels left of everything stay inside the picture. */
function outerReserve(routes: readonly Route[], labels: readonly EdgeLabel[]): number {
  const left = Math.min(...routes.flatMap((r) => r.points.map((p) => p[0])), ...labels.map((l) => l.box.x));
  const need = S.margin + S.padSide - left;
  return need > 0 ? Math.ceil(need / S.grid) * S.grid : 0;
}

/**
 * A state machine the layout engine does not lay out yet (`onEngine`), on the adaptive grid of `layout-grid`: the
 * automatic grid of layers, bars stretched, entry and exit points on their borders, routes and labels; then more
 * margin for rails reaching out left, and frames grown for their points, each a second run.
 */
export function gridState(m: StateModel): Laid {
  const cells = stateCells(m);
  let pads = new Map<string, Pads>();
  let margin = 0;
  let grown = 0;
  for (let run = 0; ; run++) {
    const spec = stateGridSpec(m, cells, pads, margin);
    const placed = placeBorderPoints(m, stretchBars(placeGrid(spec), m));
    const routing = routeStates(m, spec, placed);
    const { routes, context } = routing;
    const ends = new Map(routing.spec.edges.map((e) => [e.id, [e.from, e.to].sort().join('|')]));
    const twins = rightTwins(routes, (r) => ends.get(r.edge) ?? r.edge);
    const texts = routes.flatMap((r, i) => transitionTexts(context.lines[i] ?? [], r, i, twins.has(i)));
    const labels = placeLabels(routing.spec, placed, routes, texts);
    const reserve = outerReserve(routes, labels);
    if (reserve > 0 && run < 2 * PASSES) {
      margin += reserve;
      continue;
    }
    const fitted = fitFrames(routing.spec, placed, routes, labels);
    const more =
      grown < PASSES ? frameGrowth(m, { before: placed, after: fitted, routes, labels, ...context }, pads) : undefined;
    if (more) {
      pads = more;
      grown++;
      continue;
    }
    return { spec: routing.spec, grid: fitted, routes, labels, context };
  }
}
