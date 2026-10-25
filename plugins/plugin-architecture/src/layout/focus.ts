import type { Look } from '../looks/look.js';
import type { ArchitectureModel } from '../model/types.js';

/** What `focus: dim` draws as context: the ids of elements and the indices of edges. */
export interface Context {
  readonly nodes: ReadonlySet<string>;
  readonly edges: ReadonlySet<number>;
}

const NONE: Context = { nodes: new Set(), edges: new Set() };

/**
 * The context of a picture with `focus: dim` and a flow marked `accent`: every edge in no flow, and every element no
 * step of any flow touches, directly or through its frame, unless it is emphasized. Steps of other flows stay ink;
 * the accent flow is drawn darker by its paint. Without such a flow nothing is context.
 */
export function contextOf(model: ArchitectureModel, look: Look): Context {
  if (look.options.focus !== 'dim' || !model.flows.some((f) => f.accent)) return NONE;
  const steps = model.edges.filter((e) => e.step !== undefined);
  const touched = new Set(steps.flatMap((e) => [e.from, e.to]));
  const quiet = model.nodes.filter((n) => !n.emph && !touched.has(n.id) && !touched.has(n.group ?? ''));
  return {
    nodes: new Set(quiet.map((n) => n.id)),
    edges: new Set(model.edges.filter((e) => e.step === undefined).map((e) => e.index)),
  };
}
