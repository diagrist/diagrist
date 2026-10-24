import type { ActivityDiagram, ActivityNode, Flow, Handler } from '../diagram.js';
import { withExpansions } from './expansion.js';
import { type FlowPins, flowPins } from './pins.js';

/**
 * The diagram as a graph that rules, layout and description share: nodes with the expansion nodes of every
 * region, edges in source order with their ends at those nodes, the pin of every object flow, and lookups.
 */
export interface ActivityModel {
  readonly diagram: ActivityDiagram;
  readonly nodes: readonly ActivityNode[];
  readonly byId: ReadonlyMap<string, ActivityNode>;
  /** The edges of `diagram.flows` in the same order, ends resolved at expansion nodes. */
  readonly flows: readonly Flow[];
  /** Pins of `flows`, by the same index. */
  readonly pins: readonly FlowPins[];
  readonly handlers: readonly Handler[];
  readonly ins: (id: string) => readonly Flow[];
  readonly outs: (id: string) => readonly Flow[];
}

const grouped = (flows: readonly Flow[], key: 'from' | 'to') => {
  const map = new Map<string, Flow[]>();
  for (const f of flows) map.set(f[key], [...(map.get(f[key]) ?? []), f]);
  return (id: string): readonly Flow[] => map.get(id) ?? [];
};

/** The model of an activity diagram; the first declaration of an id wins (a second one is L108). */
export function activityModel(diagram: ActivityDiagram): ActivityModel {
  const { nodes, flows } = withExpansions(diagram.nodes, diagram.flows, diagram.expansions);
  const byId = new Map<string, ActivityNode>();
  for (const n of nodes) if (!byId.has(n.id)) byId.set(n.id, n);
  return {
    diagram,
    nodes,
    byId,
    flows,
    pins: flowPins(nodes, flows),
    handlers: diagram.handlers,
    ins: grouped(flows, 'to'),
    outs: grouped(flows, 'from'),
  };
}
