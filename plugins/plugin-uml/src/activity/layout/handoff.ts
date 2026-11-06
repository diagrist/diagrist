import type { NodeKind } from '../grammar/values.js';
import type { Graph, GraphFlow } from './graph.js';

/** Nodes that a horizontal edge may leave or enter at the side; diamonds, bars and the hourglass may not. */
const SIDEWAYS = new Set<NodeKind>([
  'action',
  'object',
  'datastore',
  'buffer',
  'send',
  'accept',
  'initial',
  'final',
  'flowfinal',
]);

/**
 * Hand-overs between lanes that may stay in one layer: an edge from the only output of a node to the only input of
 * another, into another lane, without interruption and without a pin on the way. It is drawn horizontally instead
 * of one layer lower, which saves empty room in the lanes.
 */
export function handoffCandidates(
  g: Graph,
  flows: readonly GraphFlow[],
  laneOf: ReadonlyMap<string, number>,
): GraphFlow[] {
  if (g.partitions.length < 2) return [];
  const outs = (id: string) => flows.filter((f) => f.from === id).length;
  const ins = (id: string) => flows.filter((f) => f.to === id).length;
  return flows.filter((f) => {
    const a = g.byId.get(f.from);
    const b = g.byId.get(f.to);
    if (!a || !b) return false;
    const pinned = f.kind === 'object' && (a.outputs.length > 0 || b.inputs.length > 0);
    return (
      laneOf.get(f.from) !== laneOf.get(f.to) &&
      SIDEWAYS.has(a.kind) &&
      SIDEWAYS.has(b.kind) &&
      !f.interrupt &&
      !pinned &&
      a.interruptible === b.interruptible &&
      a.expansion === b.expansion &&
      a.port === undefined &&
      b.port === undefined &&
      outs(f.from) === 1 &&
      ins(f.to) === 1
    );
  });
}
