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

/** A representative per node: nodes joined by hand-overs share a layer. */
export function representatives(merges: readonly GraphFlow[]): (id: string) => string {
  const rep = new Map<string, string>();
  const find = (id: string): string => {
    const r = rep.get(id);
    return r === undefined ? id : find(r);
  };
  for (const m of merges) {
    const [a, b] = [find(m.from), find(m.to)];
    if (a !== b) rep.set(b, a);
  }
  return find;
}

/** Hand-overs that together bring at most one node per lane into a group; the first ones win. */
export function acceptMerges(merges: readonly GraphFlow[], laneOf: ReadonlyMap<string, number>): GraphFlow[] {
  const out: GraphFlow[] = [];
  for (const m of merges) {
    const find = representatives([...out, m]);
    const group = new Set([...out, m].flatMap((o) => [o.from, o.to]).filter((id) => find(id) === find(m.from)));
    const lanes = [...group].map((id) => laneOf.get(id));
    if (new Set(lanes).size === lanes.length) out.push(m);
  }
  return out;
}

/**
 * The first hand-over whose horizontal line would run through a foreign node or a long edge: in its layer something
 * that does not belong to its group lies between the two lanes (inclusive). `check` picks the hand-overs that are
 * checked; the groups are always formed by all `merges`.
 */
export function conflicting(
  merges: readonly GraphFlow[],
  forward: readonly GraphFlow[],
  ids: readonly string[],
  layerOf: ReadonlyMap<string, number>,
  laneOf: ReadonlyMap<string, number>,
  check: readonly GraphFlow[] = merges,
): GraphFlow | undefined {
  const layer = (id: string) => layerOf.get(id) ?? 0;
  const lane = (id: string) => laneOf.get(id) ?? 0;
  const find = representatives(merges);
  return check.find((m) => {
    const l = layer(m.from);
    const lo = Math.min(lane(m.from), lane(m.to));
    const hi = Math.max(lane(m.from), lane(m.to));
    const inRange = (k: number) => k >= lo && k <= hi;
    const nodes = ids.some((id) => find(id) !== find(m.from) && layer(id) === l && inRange(lane(id)));
    const long = forward.some((f) => layer(f.from) < l && l < layer(f.to) && inRange(lane(f.from)));
    return nodes || long;
  });
}
