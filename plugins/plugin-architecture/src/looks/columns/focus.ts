import type { ArchEdge, ArchitectureModel } from '../../model/types.js';

/** What `look=columns` draws as context, in light grey instead of leaving it out. */
export interface Focus {
  readonly edge: (e: ArchEdge | undefined) => boolean;
  readonly node: (id: string) => boolean;
  readonly any: boolean;
}

/**
 * Context of a picture with a flow drawn as the focus (`accent`): every edge outside such a flow, and every
 * element that no focus edge touches and that is not emphasized. Without a focus flow nothing is context.
 */
export function focusOf(model: ArchitectureModel): Focus {
  if (!model.flows.some((f) => f.accent)) return { edge: () => false, node: () => false, any: false };
  const focused = model.edges.filter((e) => e.step?.accent === true);
  const touched = new Set(focused.flatMap((e) => [e.from, e.to]));
  const emph = new Set(model.nodes.filter((n) => n.emph).map((n) => n.id));
  const groupOf = new Map(model.nodes.map((n) => [n.id, n.group]));
  const node = (id: string) => !touched.has(id) && !emph.has(id) && !touched.has(groupOf.get(id) ?? '');
  return { edge: (e) => e !== undefined && e.step?.accent !== true, node, any: true };
}
