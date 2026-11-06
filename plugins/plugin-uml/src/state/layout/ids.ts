import type { StateModel } from '../model.js';
import { stateLines } from './box.js';
import { STATE as S } from './metrics.js';

/** Id of the edge of the transition at `index` in source order. */
export const edgeId = (index: number): string => `go-${index}`;

/** Height of the name field and compartment of a composite state; below it its inside begins. */
export function compositeHead(m: StateModel, id: string): number {
  const v = m.vertices.get(id);
  const n = v ? stateLines(m, v).length : 0;
  return S.headH + (n ? 2 * S.sectionPad + n * S.lineH : 0);
}
