import type { ArchitectureModel, ArchNode } from '../../model/types.js';

/** What stands at one place of the ring: a single neighbour, or the members of a frame side by side. */
export interface Unit {
  readonly ids: readonly string[];
  readonly group?: string;
  /** Whether the unit holds people only, which the ring prefers at the top and on the left. */
  readonly people: boolean;
}

/** The hub of the star: the emphasised element, else the one with the most edges, the first of equals. */
export function hubOf(model: ArchitectureModel): ArchNode | undefined {
  const marked = model.nodes.find((n) => n.emph);
  if (marked) return marked;
  const degree = (id: string) => model.edges.filter((e) => e.from === id || e.to === id).length;
  return model.nodes.reduce<ArchNode | undefined>(
    (best, n) => (!best || degree(n.id) > degree(best.id) ? n : best),
    undefined,
  );
}

/** The outermost frame of a node below the hub's, by which its neighbours stand together. */
function frameOf(model: ArchitectureModel, n: ArchNode): string | undefined {
  let g = model.groups.find((x) => x.id === n.group);
  while (g?.parent !== undefined) {
    const parent = model.groups.find((x) => x.id === g?.parent);
    if (!parent) break;
    g = parent;
  }
  return g?.id;
}

/** The neighbours as units in their first order: people first, then the others, each in the order of the file. */
export function unitsOf(model: ArchitectureModel, hub: ArchNode): Unit[] {
  const others = model.nodes.filter((n) => n.id !== hub.id);
  const sorted = [...others.filter((n) => n.keyword === 'person'), ...others.filter((n) => n.keyword !== 'person')];
  const units: Unit[] = [];
  const byGroup = new Map<string, string[]>();
  for (const n of sorted) {
    const g = frameOf(model, n);
    const own = g === undefined ? undefined : byGroup.get(g);
    if (own) {
      own.push(n.id);
      continue;
    }
    const ids = [n.id];
    if (g !== undefined) byGroup.set(g, ids);
    units.push({ ids, ...(g === undefined ? {} : { group: g }), people: false });
  }
  const kind = new Map(others.map((n) => [n.id, n.keyword]));
  return units.map((u) => ({ ...u, people: u.ids.every((id) => kind.get(id) === 'person') }));
}

/** How far apart two places of a ring of `n` are, the shorter way round. */
const apart = (a: number, b: number, n: number): number => Math.min(Math.abs(a - b), n - Math.abs(a - b));

/**
 * The cost of an order: an edge between neighbours that are not next to each other on the ring costs by how many
 * places lie between them, since its line has to go round them.
 */
function costOf(order: readonly Unit[], pairs: readonly (readonly [string, string])[]): number {
  const at = new Map(order.flatMap((u, i) => u.ids.map((id) => [id, i] as const)));
  return pairs.reduce((sum, [a, b]) => {
    const i = at.get(a);
    const k = at.get(b);
    return i === undefined || k === undefined ? sum : sum + Math.max(0, apart(i, k, order.length) - 1);
  }, 0);
}

/**
 * The units in the order round the ring that keeps edges between neighbours short: moves of one unit to another
 * place, as long as one makes the order cheaper, starting from the first order, so ties keep it.
 */
export function ringOrder(units: readonly Unit[], model: ArchitectureModel, hub: string): Unit[] {
  const pairs = model.edges.flatMap((e) =>
    e.from !== hub && e.to !== hub && e.from !== e.to ? [[e.from, e.to] as const] : [],
  );
  let order = [...units];
  let cost = costOf(order, pairs);
  for (let better = true; better && cost > 0; ) {
    better = false;
    for (let i = 0; i < order.length && !better; i++)
      for (let k = 0; k < order.length && !better; k++) {
        if (i === k) continue;
        const next = [...order];
        const [u] = next.splice(i, 1);
        next.splice(k, 0, u as Unit);
        const c = costOf(next, pairs);
        if (c < cost) {
          order = next;
          cost = c;
          better = true;
        }
      }
  }
  return order.map((u, i) => (u.ids.length > 1 ? inside(u, order, i, pairs) : u));
}

/** The members of a unit with those linked to the unit before it first and those linked to the one after it last. */
function inside(u: Unit, order: readonly Unit[], i: number, pairs: readonly (readonly [string, string])[]): Unit {
  const n = order.length;
  const linked = (id: string, other: Unit | undefined) =>
    other !== undefined &&
    pairs.some(([a, b]) => (a === id && other.ids.includes(b)) || (b === id && other.ids.includes(a)));
  const before = order[(i + n - 1) % n];
  const after = order[(i + 1) % n];
  const side = (id: string) => (linked(id, before) ? -1 : 0) + (linked(id, after) ? 1 : 0);
  return { ...u, ids: [...u.ids].sort((a, b) => side(a) - side(b)) };
}
