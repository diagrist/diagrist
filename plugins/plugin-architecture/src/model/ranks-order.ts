import type { ArchitectureModel } from './types.js';

/** Ids of the elements in one band, in the order they stand from left to right. */
export type Band = readonly string[];

/** The unit a node moves with: the group it lies in directly, else the node alone. */
const unitOf = (model: ArchitectureModel, id: string): string =>
  model.nodes.find((n) => n.id === id)?.group ?? `node:${id}`;

/** The units of a band in source order, each with its members in source order. */
function unitsOf(model: ArchitectureModel, band: Band): Map<string, string[]> {
  const units = new Map<string, string[]>();
  for (const id of band) {
    const key = unitOf(model, id);
    units.set(key, [...(units.get(key) ?? []), id]);
  }
  return units;
}

/** The units joined by an edge between their members, both ways. */
function linksOf(model: ArchitectureModel, units: ReadonlyMap<string, readonly string[]>): Map<string, Set<string>> {
  const owner = new Map([...units].flatMap(([key, ids]) => ids.map((id) => [id, key] as const)));
  const links = new Map([...units.keys()].map((key) => [key, new Set<string>()]));
  for (const e of model.edges) {
    const a = owner.get(e.from);
    const b = owner.get(e.to);
    if (a === undefined || b === undefined || a === b) continue;
    links.get(a)?.add(b);
    links.get(b)?.add(a);
  }
  return links;
}

/**
 * The units as a walk along their links: each chain starts at its end with the fewest links and goes on to a linked
 * unit not yet taken, so linked units stand side by side wherever a path allows it; of equal ends the one more edges
 * leave than enter comes first, so a chain reads from left to right.
 */
function walk(
  order: readonly string[],
  links: ReadonlyMap<string, ReadonlySet<string>>,
  lead: (key: string) => number,
): string[] {
  const taken = new Set<string>();
  const out: string[] = [];
  const degree = (key: string) => [...(links.get(key) ?? [])].filter((k) => !taken.has(k)).length;
  while (out.length < order.length) {
    const open = order.filter((k) => !taken.has(k));
    let at = [...open].sort(
      (a, b) => degree(a) - degree(b) || lead(b) - lead(a) || order.indexOf(a) - order.indexOf(b),
    )[0];
    while (at !== undefined) {
      taken.add(at);
      out.push(at);
      at = order.find((k) => !taken.has(k) && links.get(out.at(-1) ?? '')?.has(k));
    }
  }
  return out;
}

/** True when an edge joins `id` with one of `others`. */
const touches = (model: ArchitectureModel, id: string, others: readonly string[]): boolean =>
  model.edges.some((e) => (e.from === id && others.includes(e.to)) || (e.to === id && others.includes(e.from)));

/**
 * The band in an order where neighbours joined by an edge, and the members of a group, stand side by side; inside a
 * group the member linked to the unit before it comes first and the one linked to the unit after it last.
 */
export function orderBand(model: ArchitectureModel, band: Band): Band {
  const units = unitsOf(model, band);
  const inside = new Set(band);
  const lead = (key: string) =>
    model.edges
      .filter((e) => inside.has(e.from) && inside.has(e.to))
      .reduce((sum, e) => {
        const ids = units.get(key) ?? [];
        return sum + (ids.includes(e.from) ? 1 : 0) - (ids.includes(e.to) ? 1 : 0);
      }, 0);
  const keys = walk([...units.keys()], linksOf(model, units), lead);
  return keys.flatMap((key, i) => {
    const ids = units.get(key) ?? [];
    const before = units.get(keys[i - 1] ?? '') ?? [];
    const after = units.get(keys[i + 1] ?? '') ?? [];
    const rank = (id: string) => (touches(model, id, before) ? -1 : touches(model, id, after) ? 1 : 0);
    return [...ids].sort((a, b) => rank(a) - rank(b));
  });
}

/** True when the node is alone in its unit and joined to nobody else in the band. */
export const loose = (model: ArchitectureModel, id: string, band: Band): boolean =>
  unitOf(model, id) === `node:${id}` &&
  !touches(
    model,
    id,
    band.filter((other) => other !== id),
  );
