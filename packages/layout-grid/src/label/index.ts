import type { GridLayout, Route } from '../layout.js';
import { boardOf } from '../route/boxes.js';
import type { GridSpec } from '../spec.js';
import { adaptiveLabels } from './adaptive.js';
import { endLabels } from './ends.js';
import { namedOf } from './named.js';
import type { OnLine } from './on-line.js';
import { signEdges } from './signs.js';
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
 * and marks find room around them, in a channel grid at a spot clear of boxes, heads, foreign frames and lines; in an
 * adaptive grid end texts stand first and names move to a free spot.
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
  if (!spec.adaptive && spec.channels === true) {
    const { labels } = signEdges(spec, layout, routes, texts, [], options);
    return [...labels, ...endLabels(board, routes, byEdge, labels)];
  }
  const named = namedOf(spec, routes, byEdge, options);
  if (!spec.adaptive) return [...named, ...endLabels(board, routes, byEdge, named)];
  const ends = endLabels(board, routes, byEdge, []);
  return [...adaptiveLabels(board, named, routes, ends, false, options.onLine !== undefined), ...ends];
}

/**
 * Labels a kind phrased and placed itself, such as the texts of an edge beside its rail or loop: they stay where they
 * are when that place is free, else they move as one block per route to the first free spot of an adaptive grid, as
 * `labelEdges` moves names.
 */
export function placeLabels(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  labels: readonly EdgeLabel[],
): EdgeLabel[] {
  return adaptiveLabels(boardOf(spec, layout), labels, routes, [], true);
}
