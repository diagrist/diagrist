import { type AreaMark, areaMark, domId, type Shape } from '@diagrist/core';
import type { ArchitectureLayout } from '../layout/index.js';
import { edgeArea, groupArea, nodeArea } from '../model/areas.js';
import type { ArchitectureModel } from '../model/types.js';

/** The area marks of the picture's groups by DOM id: elements as bodies, frames, edges and their labels as lines. */
function marks(model: ArchitectureModel, layout: ArchitectureLayout): Map<string, AreaMark> {
  const out = new Map<string, AreaMark>();
  const put = (id: string, area: string | undefined, as: 'body' | 'line') => {
    const mark = areaMark(model.areas, area, as);
    if (mark !== undefined) out.set(id, mark);
  };
  for (const n of model.nodes) put(domId.node(n.id), nodeArea(model, n.id), 'body');
  for (const g of model.groups) put(domId.group(g.id), groupArea(model, g.id), 'line');
  layout.routes.forEach((r, i) => {
    const e = model.edges[Number(r.edge)];
    if (e === undefined) return;
    const area = edgeArea(model, e);
    put(domId.edge(i), area, 'line');
    put(domId.label(i), area, 'line');
  });
  return out;
}

/**
 * The shapes with every group of an element, frame, edge or label marked with its area (ADR 0033), which the kernel
 * paints in the area's tone. A picture without coloured areas keeps its shapes.
 */
export function inAreas(shapes: readonly Shape[], model: ArchitectureModel, layout: ArchitectureLayout): Shape[] {
  const found = marks(model, layout);
  if (found.size === 0) return [...shapes];
  return shapes.map((s): Shape => {
    const area = s.kind === 'group' && s.id !== undefined ? found.get(s.id) : undefined;
    return s.kind === 'group' && area !== undefined ? { ...s, area } : s;
  });
}
