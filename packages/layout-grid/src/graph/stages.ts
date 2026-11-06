import type { LayeredLayout } from '../layered/output.js';
import type { LayeredSpec } from '../layered/spec.js';
import { stretchBars, widenBars } from './bars.js';
import { placeDocks } from './dock-place.js';
import { dockGraph } from './docks.js';
import { fillParts } from './parts.js';
import type { LayoutGraph } from './spec.js';
import { turnBack, turnGraph } from './turn.js';

/** Rounds of laying a picture out again with its bars as wide as their lines wanted them in the round before. */
const WIDEN = 3;

/**
 * The stages of a layout graph around the layered ones (layout plan P8): a graph whose layers run right is turned
 * first and the picture turned back last; docked nodes leave the graph for edges through their outline and come back
 * on it; between, parts fill their parent and bars stretch over their branches, the picture laid out again, up to
 * `WIDEN` times, with bars as wide as their branches want them where one wants more. Each stage hands a picture without
 * its parts back as it is, so other pictures keep their bytes.
 */
export function staged(
  graph: LayoutGraph,
  lay: (graph: LayoutGraph) => LayeredLayout,
  specOf: (graph: LayoutGraph) => LayeredSpec,
): LayeredLayout {
  const turned = turnGraph(graph);
  const docked = dockGraph(turned);
  const run = (g: LayoutGraph) => stretchBars(g, fillParts(g, lay(g)));
  let current = docked.graph;
  let barred = run(current);
  for (let round = 0; round < WIDEN; round++) {
    const wide = widenBars(current, barred);
    if (wide === undefined) break;
    current = wide;
    barred = run(current);
  }
  return turnBack(graph, placeDocks(turned, docked.plan, barred, specOf), specOf);
}
