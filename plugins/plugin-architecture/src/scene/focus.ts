import { domId, type Shape } from '@diagrist/core';
import type { ArchitectureLayout } from '../layout/index.js';
import type { ArchitectureModel } from '../model/types.js';

/** The DOM ids of the groups the context of `focus: dim` greys: its elements, its edges and their labels. */
function contextIds(model: ArchitectureModel, layout: ArchitectureLayout): Set<string> {
  const { context } = layout;
  const edges = layout.routes.flatMap((r, i) => {
    const e = model.edges[Number(r.edge)];
    return e && context.edges.has(e.index) ? [domId.edge(i), domId.label(i)] : [];
  });
  return new Set([...[...context.nodes].map(domId.node), ...edges]);
}

/** The shapes with every group of the context in the role `context`, which the look paints greyed as a whole. */
export function dimmed(shapes: readonly Shape[], model: ArchitectureModel, layout: ArchitectureLayout): Shape[] {
  const ids = contextIds(model, layout);
  if (ids.size === 0) return [...shapes];
  return shapes.map(
    (s): Shape => (s.kind === 'group' && s.id !== undefined && ids.has(s.id) ? { ...s, role: 'context' } : s),
  );
}
