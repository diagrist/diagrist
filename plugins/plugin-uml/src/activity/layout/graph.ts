import type { ActivityNode, Expansion, Flow, Partition, Region } from '../diagram.js';
import type { ActivityModel } from '../model/index.js';
import type { FlowPins } from '../model/pins.js';

/** An edge as the layout sees it; an exception handler is one too, a bolt to the handler's exception pin. */
export interface GraphFlow extends Flow {
  /** Place in `Graph.flows`, which is also the index of its edge in the picture. */
  readonly index: number;
  /** The type of the exception, on the edge the layout makes of a handler. */
  readonly exception?: string;
}

/** What the layout lays out: nodes with expansion nodes, edges and handler bolts, lanes and regions. */
export interface Graph {
  readonly nodes: readonly ActivityNode[];
  readonly byId: ReadonlyMap<string, ActivityNode>;
  readonly flows: readonly GraphFlow[];
  /** Pins of `flows` by index; a handler bolt has none. */
  readonly pins: readonly FlowPins[];
  readonly partitions: readonly Partition[];
  readonly regions: readonly Region[];
  readonly expansions: readonly Expansion[];
}

/** Is the edge the bolt of an exception handler? */
export const isHandlerFlow = (f: GraphFlow): f is GraphFlow & { readonly exception: string } =>
  f.exception !== undefined;

/**
 * The layout treats every exception handler (UML 2.5.1, 15.5.3.1) like a horizontal hand-over: the handler stands
 * beside the protected action in its layer and the bolt runs from side to side. The bolts follow the real edges.
 */
export function layoutGraph(m: ActivityModel): Graph {
  const bolts = m.handlers
    .filter((h) => m.byId.has(h.protected) && m.byId.has(h.handler) && h.protected !== h.handler)
    .map((h): Flow & { exception: string } => ({
      from: h.protected,
      to: h.handler,
      kind: 'control',
      interrupt: true,
      else: false,
      exception: h.exception,
      span: h.span,
    }));
  const flows = [...m.flows, ...bolts].map((f, index): GraphFlow => ({ ...f, index }));
  return {
    nodes: m.nodes,
    byId: m.byId,
    flows,
    pins: flows.map((_, i) => m.pins[i] ?? {}),
    partitions: m.diagram.partitions,
    regions: m.diagram.regions,
    expansions: m.diagram.expansions,
  };
}

/** Handler actions and the action each protects first. */
export const handlerOf = (g: Graph): Map<string, string> =>
  new Map(g.flows.filter(isHandlerFlow).map((f) => [f.to, f.from]));
