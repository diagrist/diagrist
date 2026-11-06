import type { LayeredSpec } from './spec.js';

/**
 * The lane of every node by its place in `LayeredSpec.lanes`: its own, else that of the first node it is linked to
 * that has one, else the first lane (ADR 0039).
 */
export function nodeLanes(spec: LayeredSpec): Map<string, number> {
  const of = new Map((spec.lanes ?? []).flatMap((lane, i) => lane.members.map((m) => [m, i] as const)));
  for (let changed = true; changed; ) {
    changed = false;
    for (const n of spec.nodes) {
      if (of.has(n.id)) continue;
      const linked = spec.edges.flatMap((e) => (e.from === n.id ? [e.to] : e.to === n.id ? [e.from] : []));
      const found = linked.map((m) => of.get(m)).find((i) => i !== undefined);
      if (found === undefined) continue;
      of.set(n.id, found);
      changed = true;
    }
  }
  for (const n of spec.nodes) if (!of.has(n.id)) of.set(n.id, 0);
  return of;
}

/**
 * Hand-overs between lanes: an edge ranked beside (rank 0) whose ends stand in two lanes joins them into one layer,
 * so the line runs from side to side instead of a layer down. The first hand-overs win; one that would bring two
 * nodes of one lane into a layer group stays an edge of its own. Gives the representative of every node's group, the
 * node itself where it hands over nothing or the picture has no lanes.
 */
export function handOvers(spec: LayeredSpec): (id: string) => string {
  const rep = new Map<string, string>();
  const find = (id: string): string => {
    const r = rep.get(id);
    return r === undefined ? id : find(r);
  };
  if ((spec.lanes ?? []).length === 0) return find;
  const lane = nodeLanes(spec);
  for (const e of spec.edges.filter((k) => k.rank === 0 && k.from !== k.to)) {
    const [a, b] = [find(e.from), find(e.to)];
    if (a === b || lane.get(e.from) === lane.get(e.to)) continue;
    const group = (r: string) => spec.nodes.filter((n) => find(n.id) === r).map((n) => lane.get(n.id));
    const joined = [...group(a), ...group(b)];
    if (new Set(joined).size === joined.length) rep.set(b, a);
  }
  return find;
}
