import type { GraphRank } from '@diagrist/layout-grid';
import type { Graph, GraphFlow } from './graph.js';

/** An edge the layout graph holds but does not draw: it only keeps its ends in layers. */
export interface HiddenLink {
  readonly from: string;
  readonly to: string;
  readonly rank: GraphRank;
}

/**
 * Lane per node: its own from `in`, else that of its first predecessor with a lane, else that of its first
 * successor. Start, ends and bars without `in` so stand beside their neighbour.
 */
export function nodeLanes(g: Graph): Map<string, number> {
  const index = new Map(g.partitions.map((p, i) => [p.id, i]));
  const lane = new Map<string, number>();
  for (const n of g.nodes) {
    const own = n.lane === undefined ? undefined : index.get(n.lane);
    if (own !== undefined) lane.set(n.id, own);
  }
  const pick = (id: string, key: 'from' | 'to', other: 'from' | 'to') =>
    g.flows.filter((f) => f[key] === id && lane.has(f[other])).map((f) => lane.get(f[other]))[0];
  for (let changed = true; changed; ) {
    changed = false;
    for (const n of g.nodes) {
      if (lane.has(n.id)) continue;
      const found = pick(n.id, 'to', 'from') ?? pick(n.id, 'from', 'to');
      if (found === undefined) continue;
      lane.set(n.id, found);
      changed = true;
    }
  }
  for (const n of g.nodes) if (!lane.has(n.id)) lane.set(n.id, 0);
  return lane;
}

/**
 * Triggers of an interruptible region (members without input, mostly `accept`) would stand on top, far from their
 * region. They follow the predecessors of its last member, the one no flow leaves to another member, so they stand
 * beside it and the interrupting edge leaves the region downwards.
 */
export function triggerLinks(g: Graph, flows: readonly GraphFlow[]): HiddenLink[] {
  return g.regions.flatMap((region) => {
    const members = g.nodes.filter((n) => n.interruptible === region.id).map((n) => n.id);
    const triggers = members.filter((id) => !flows.some((f) => f.to === id));
    const core = members.filter((id) => !triggers.includes(id));
    const last = core.filter((id) => !flows.some((f) => f.from === id && core.includes(f.to) && f.to !== id)).at(-1);
    if (triggers.length === 0 || last === undefined) return [];
    const preds = flows.filter((f) => f.to === last && !triggers.includes(f.from)).map((f) => f.from);
    return triggers.flatMap((t) => preds.map((p): HiddenLink => ({ from: p, to: t, rank: 'down' })));
  });
}

/** The members of `ids` that flows reach from `from`, staying among `ids`, forwards or backwards. */
function reached(g: Graph, from: readonly string[], ids: ReadonlySet<string>, back: boolean): Set<string> {
  const seen = new Set(from);
  const queue = [...from];
  for (let n = queue.shift(); n !== undefined; n = queue.shift())
    for (const f of g.flows) {
      const [a, b] = back ? [f.to, f.from] : [f.from, f.to];
      if (a === n && ids.has(b) && !seen.has(b)) {
        seen.add(b);
        queue.push(b);
      }
    }
  return seen;
}

/**
 * The expansion nodes of a region around its members: every member no flow reaches from an input below one, every
 * member that reaches no output above one, and several inputs, or outputs, of one region in one layer on its edge.
 */
export function expansionLinks(g: Graph): HiddenLink[] {
  const ports = g.nodes.flatMap((n) => (n.port ? [{ id: n.id, port: n.port }] : []));
  return g.expansions.flatMap((x) => {
    const own = ports.filter((p) => p.port.region === x.id);
    const members = g.nodes.filter((n) => n.expansion === x.id && n.port === undefined).map((n) => n.id);
    const ids = new Set(members);
    const [ins, outs] = (['in', 'out'] as const).map((s) => own.filter((p) => p.port.side === s).map((p) => p.id));
    const fed = reached(g, ins ?? [], ids, false);
    const drained = reached(g, outs ?? [], ids, true);
    const ties = (list: readonly string[]) =>
      list.slice(1).map((id): HiddenLink => ({ from: list[0] as string, to: id, rank: 'beside' }));
    const first = ins?.[0];
    const last = outs?.[0];
    return [
      ...ties(ins ?? []),
      ...ties(outs ?? []),
      ...(first
        ? members.filter((m) => !fed.has(m)).map((m): HiddenLink => ({ from: first, to: m, rank: 'down' }))
        : []),
      ...(last
        ? members.filter((m) => !drained.has(m)).map((m): HiddenLink => ({ from: m, to: last, rank: 'down' }))
        : []),
    ];
  });
}
