import type { Route } from '../layout.js';
import type { GridSpec } from '../spec.js';
import { type OnLine, onLineTexts } from './on-line.js';
import { routeTexts } from './text.js';
import type { EdgeLabel, EdgeText } from './types.js';

/** Names and details of every route with a text, on its line or beside its longest segment, before any search. */
export function namedOf(
  spec: GridSpec,
  routes: readonly Route[],
  byEdge: ReadonlyMap<string, EdgeText>,
  o: { readonly preferFlat?: boolean; readonly onLine?: OnLine },
): EdgeLabel[] {
  return routes.flatMap((r, i) => {
    const text = byEdge.get(r.edge);
    if (!text) return [];
    return o.onLine !== undefined
      ? onLineTexts(text, i, routes, spec.metrics, o.onLine)
      : routeTexts(text, i, routes, spec.metrics, o.preferFlat === true);
  });
}
