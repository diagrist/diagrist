import type { GridLayout, Route } from '../layout.js';
import { boardOf } from '../route/boxes.js';
import type { GridSpec } from '../spec.js';
import { adaptiveLabels } from './adaptive.js';
import { endLabels } from './ends.js';
import { namedOf } from './named.js';
import type { OnLine } from './on-line.js';
import type { EdgeLabel, EdgeText } from './types.js';

/** How labels are placed. */
export interface LabelOptions {
  /** Puts the name on the longest horizontal segment, as cards want. */
  readonly preferFlat?: boolean;
  /** Stands name and detail on the line as one block, which the kind cuts out of the line, as paper wants. */
  readonly onLine?: OnLine;
}

/**
 * Labels of all routes: names and details first, then the end texts. In a fixed grid names stay at their segment
 * and marks find room around them; in an adaptive grid end texts stand first and names move to a free spot. A channel
 * grid sets its texts with `signEdges`.
 */
export function labelEdges(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  texts: readonly EdgeText[],
  options: LabelOptions = {},
): EdgeLabel[] {
  const board = boardOf(spec, layout);
  const byEdge = new Map(texts.map((t) => [t.edge, t]));
  const named = namedOf(spec, routes, byEdge, options);
  if (!spec.adaptive) return [...named, ...endLabels(board, routes, byEdge, named)];
  const ends = endLabels(board, routes, byEdge, []);
  return [...adaptiveLabels(board, named, routes, ends, options.onLine !== undefined), ...ends];
}
