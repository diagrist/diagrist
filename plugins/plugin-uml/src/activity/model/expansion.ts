import type { ActivityNode, Expansion, ExpansionPort, Flow } from '../diagram.js';
import { flowPins } from './pins.js';

/** Id of the expansion node `index` of a side: the first input is named like its region, `~` never is in an id. */
const portId = (region: string, side: 'in' | 'out', index: number): string =>
  side === 'in' ? (index === 0 ? region : `${region}~in${index + 1}`) : `${region}~out${index ? index + 1 : ''}`;

/** Names of the expansion nodes of a side; without any, one without a name. */
const portNames = (x: Expansion, side: 'in' | 'out'): (string | undefined)[] => {
  const names = side === 'in' ? x.inputs : x.outputs;
  return names.length ? [...names] : [undefined];
};

/** The nodes and edges of an activity with its expansion regions resolved into expansion nodes. */
export interface Expanded {
  readonly nodes: readonly ActivityNode[];
  /** In the order of the source; an edge at a region id ends at one of its expansion nodes. */
  readonly flows: readonly Flow[];
}

/**
 * Expansion regions as part of the graph: per region one input node per name in `input=` (one without a name if
 * there are none), the same for outputs, where an unnamed output exists only when an edge uses it. An edge at the
 * region's id means an input from outside and an output towards outside, an output from inside and an input towards
 * inside. Which one: `pin=`, else the pin of the same name at the other end, else the next free one. The inputs
 * stand before the region's members in source order, the outputs after them, in their lane.
 */
export function withExpansions(
  nodes: readonly ActivityNode[],
  flows: readonly Flow[],
  expansions: readonly Expansion[],
): Expanded {
  if (expansions.length === 0) return { nodes, flows };
  const regionOf = new Map(nodes.map((n) => [n.id, n.expansion]));
  const byId = new Map(expansions.map((x) => [x.id, x]));
  const chosen = flowPins(nodes, flows);
  const used = new Map<string, Set<number>>();
  const pick = (x: Expansion, side: 'in' | 'out', dir: string, f: Flow, other: string | undefined) => {
    const names = portNames(x, side);
    const key = `${x.id}|${side}|${dir}`;
    const taken = used.get(key) ?? new Set<number>();
    used.set(key, taken);
    const free = (k: number) => k >= 0 && !taken.has(k);
    const named = f.pin === undefined ? -1 : names.indexOf(f.pin);
    const same = other === undefined ? -1 : names.indexOf(other);
    const k = named >= 0 ? named : free(same) ? same : names.findIndex((_, i) => free(i));
    const at = Math.max(0, k);
    taken.add(at);
    return portId(x.id, side, at);
  };
  const resolved = flows.map((f, i): Flow => {
    let { from, to } = f;
    const a = byId.get(f.from);
    const b = byId.get(f.to);
    if (a) from = pick(a, regionOf.get(f.to) === a.id ? 'in' : 'out', 'from', f, chosen[i]?.to);
    if (b) to = pick(b, regionOf.get(f.from) === b.id ? 'out' : 'in', 'to', f, chosen[i]?.from);
    return from === f.from && to === f.to ? f : { ...f, from, to };
  });
  const out: ActivityNode[] = [...nodes];
  for (const x of expansions) {
    const members = out.filter((n) => n.expansion === x.id);
    const lane = members.find((n) => n.lane)?.lane;
    const node = (side: 'in' | 'out', index: number, name: string | undefined): ActivityNode => {
      const port: ExpansionPort = { region: x.id, side, mode: x.mode, index, ...(name ? { name } : {}) };
      return {
        id: portId(x.id, side, index),
        kind: 'object',
        label: '',
        ...(lane ? { lane } : {}),
        inputs: [],
        outputs: [],
        call: false,
        span: x.span,
        port,
      };
    };
    const first = members[0] ? out.indexOf(members[0]) : out.length;
    out.splice(first, 0, ...portNames(x, 'in').map((name, k) => node('in', k, name)));
    const outs = portNames(x, 'out')
      .map((name, k) => node('out', k, name))
      .filter((n) => n.port?.name !== undefined || resolved.some((f) => f.from === n.id || f.to === n.id));
    const last = members.at(-1);
    out.splice(last ? out.indexOf(last) + 1 : out.length, 0, ...outs);
  }
  return { nodes: out, flows: resolved };
}
