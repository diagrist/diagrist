import { textWidth } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import { LEGEND, type LegendItem } from '@diagrist/parts';
import type { EdgeKind } from '../grammar/edges.js';
import { SHAPES, STATUSES } from '../grammar/elements.js';
import type { ArchitectureModel, NodeShape, Role } from '../model/types.js';
import type { Texts } from '../texts/index.js';
import type { Metrics } from './metrics.js';

/** A swatch stands for a role of frames, a core decision or a life cycle. */
export type SwatchRole = Role | 'emph' | 'planned' | 'deprecated';

/** What a legend entry shows before its text; the scene draws it. */
export type Sample =
  | { readonly kind: 'edge'; readonly edge: EdgeKind }
  | { readonly kind: 'swatch'; readonly role: SwatchRole }
  | { readonly kind: 'shape'; readonly shape: NodeShape }
  | { readonly kind: 'replicas' }
  | { readonly kind: 'badge'; readonly n: number; readonly accent: boolean }
  | { readonly kind: 'mark' }
  | { readonly kind: 'none' };

const ROLES: readonly Role[] = ['own', 'shared', 'external'];
const EDGE_ORDER: readonly EdgeKind[] = ['sync', 'async', 'dependency', 'data', 'link', 'duplex'];
const NARROW = 12;
/** Width of a shape sample, narrower than a line. */
export const SHAPE_SAMPLE = { w: 36, h: 20 } as const;

const wide = (sample: Sample, text: string, sampleWidth: number = LEGEND.sampleWidth): LegendItem<Sample> => ({
  sample,
  sampleWidth,
  labelDx: LEGEND.labelDx,
  text,
});
const narrow = (sample: Sample, text: string, sampleWidth: number): LegendItem<Sample> => ({
  sample,
  sampleWidth: Math.max(NARROW, sampleWidth),
  labelDx: LEGEND.markDx,
  text,
});

/**
 * What the legend explains: only what the picture shows, in a fixed order: kinds of edges, flows, roles of frames,
 * core decision, life cycle, replicas, shapes, decision marks, icons.
 */
export function legendItems(
  model: ArchitectureModel,
  routes: readonly Route[],
  marked: boolean,
  texts: Texts,
  m: Metrics,
): LegendItem<Sample>[] {
  const out: LegendItem<Sample>[] = [];
  const nodes = model.nodes;
  const kinds = new Set(routes.map((r) => model.edges[Number(r.edge)]?.kind));
  for (const kind of EDGE_ORDER) if (kinds.has(kind)) out.push(wide({ kind: 'edge', edge: kind }, texts.edges[kind]));
  for (const f of model.flows) {
    const sample = { kind: 'badge', n: f.from, accent: f.accent } as const;
    out.push(narrow(sample, texts.flow(f.id, f.from, f.to), textWidth(`(${f.from})`, m.fonts.note)));
  }
  const roles = new Set(model.groups.map((g) => g.role));
  for (const role of ROLES) if (roles.has(role)) out.push(wide({ kind: 'swatch', role }, texts.roles[role]));
  if (nodes.some((n) => n.emph)) out.push(wide({ kind: 'swatch', role: 'emph' }, texts.emph));
  for (const status of STATUSES)
    if (nodes.some((n) => n.status === status)) out.push(wide({ kind: 'swatch', role: status }, texts.status[status]));
  if (nodes.some((n) => n.replicas !== undefined)) out.push(narrow({ kind: 'replicas' }, texts.replicas, 0));
  for (const shape of SHAPES)
    if (nodes.some((n) => n.shape === shape))
      out.push(wide({ kind: 'shape', shape }, texts.shapes[shape], SHAPE_SAMPLE.w));
  if (marked) out.push(narrow({ kind: 'mark' }, texts.mark, textWidth('E1', m.fonts.note)));
  if (nodes.some((n) => n.icon)) out.push({ sample: { kind: 'none' }, sampleWidth: 0, labelDx: 0, text: texts.icon });
  return out;
}
