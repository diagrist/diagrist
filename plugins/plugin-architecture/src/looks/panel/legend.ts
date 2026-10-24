import type { Route } from '@diagrist/layout-grid';
import type { EdgeKind } from '../../grammar/edges.js';
import { SHAPES, STATUSES } from '../../grammar/elements.js';
import type { ArchitectureModel, NodeShape, NodeStatus } from '../../model/types.js';
import type { Texts } from '../../texts/index.js';
import { PARTIES, type Party, partyOf } from './party.js';
import type { PanelWords } from './words.js';

/** What a row of the legend card shows before its text; the scene draws it. */
export type PanelSample =
  | { readonly kind: 'edge'; readonly edge: EdgeKind }
  | { readonly kind: 'party'; readonly party: Party }
  | { readonly kind: 'badge'; readonly n: number; readonly accent: boolean }
  | { readonly kind: 'focus' }
  | { readonly kind: 'status'; readonly status: NodeStatus }
  | { readonly kind: 'replicas' }
  | { readonly kind: 'shape'; readonly shape: NodeShape }
  | { readonly kind: 'mark' }
  | { readonly kind: 'icon' };

/** A row of the legend card: its sample and what it means. */
export interface PanelEntry {
  readonly sample: PanelSample;
  readonly text: string;
}

const EDGE_ORDER: readonly EdgeKind[] = ['sync', 'async', 'dependency', 'data', 'link', 'duplex'];

/**
 * The rows of the legend card in three columns, only for what the picture shows: the lines and flows, the colours
 * of the parties with the card in focus and the life cycle, and the remaining signs: replicas, shapes, decision
 * marks and icons. Empty columns are left out.
 */
export function panelEntries(
  model: ArchitectureModel,
  routes: readonly Route[],
  marked: boolean,
  texts: Texts,
  words: PanelWords,
): PanelEntry[][] {
  const nodes = model.nodes;
  const groups = new Map(model.groups.map((g) => [g.id, g]));
  const kinds = new Set(routes.map((r) => model.edges[Number(r.edge)]?.kind));
  const parties = new Set(nodes.map((n) => partyOf(n, groups)));
  const party = (p: Party): string =>
    p === 'person' ? words.person : p === 'none' ? words.none : (texts.roles[p] ?? words.none);
  const entry = (sample: PanelSample, text: string): PanelEntry => ({ sample, text });
  const lines = [
    ...EDGE_ORDER.filter((k) => kinds.has(k)).map((edge) => entry({ kind: 'edge', edge }, texts.edges[edge])),
    ...model.flows.map((f) => entry({ kind: 'badge', n: f.from, accent: f.accent }, texts.flow(f.id, f.from, f.to))),
  ];
  const colours = [
    ...PARTIES.filter((p) => parties.has(p)).map((p) => entry({ kind: 'party', party: p }, party(p))),
    ...(nodes.some((n) => n.emph) ? [entry({ kind: 'focus' }, texts.emph)] : []),
    ...STATUSES.filter((s) => nodes.some((n) => n.status === s)).map((status) =>
      entry({ kind: 'status', status }, texts.status[status]),
    ),
  ];
  const signs = [
    ...(nodes.some((n) => n.replicas !== undefined) ? [entry({ kind: 'replicas' }, texts.replicas)] : []),
    ...SHAPES.filter((s) => nodes.some((n) => n.shape === s)).map((shape) =>
      entry({ kind: 'shape', shape }, texts.shapes[shape]),
    ),
    ...(marked ? [entry({ kind: 'mark' }, words.mark)] : []),
    ...(nodes.some((n) => n.icon) ? [entry({ kind: 'icon' }, words.icon)] : []),
  ];
  return [lines, colours, signs].filter((column) => column.length > 0);
}
