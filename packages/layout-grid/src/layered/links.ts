import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** One piece of an edge between two neighbouring layers, from its upper end to its lower end. */
export interface Link {
  readonly edge: string;
  readonly upper: string;
  readonly lower: string;
  /** The layer of the upper end; the piece runs in the gap below it. */
  readonly gap: number;
}

/**
 * Pieces that share a trunk: a fan leaves one node and branches to several below, a join gathers several into one
 * node below. A single piece shares nothing.
 */
export interface Group {
  readonly kind: 'single' | 'fan' | 'join';
  readonly links: readonly Link[];
}

/** Every piece of every edge, chain by chain, in the order of the edges. */
export const linksOf = (spec: LayeredSpec, ranked: Ranked): Link[] =>
  spec.edges.flatMap((e) => {
    const chain = ranked.chains.get(e.id) ?? [];
    return chain.slice(1).map((lower, i) => {
      const upper = chain[i] as string;
      return { edge: e.id, upper, lower, gap: ranked.layerOf.get(upper) ?? 0 };
    });
  });

/**
 * The pieces split into runs whose `end` boxes stand side by side in `layer`, with no other box between them;
 * placeholders may stand between, and a piece to a placeholder belongs to the run it stands in.
 */
function runs(
  members: readonly Link[],
  end: (l: Link) => string,
  layer: readonly string[],
  dummies: ReadonlySet<string>,
): Link[][] {
  const sorted = [...members].sort((a, b) => layer.indexOf(end(a)) - layer.indexOf(end(b)));
  const out: Link[][] = [];
  for (const l of sorted) {
    const run = out.at(-1);
    const prev = run?.at(-1);
    const between = prev === undefined ? [] : layer.slice(layer.indexOf(end(prev)) + 1, layer.indexOf(end(l)));
    if (run && between.every((n) => dummies.has(n))) run.push(l);
    else out.push([l]);
  }
  return out;
}

/**
 * The pieces in groups: pieces of one bundle leaving the same box form a fan for every run of boxes they reach
 * that stand together, the rest of one bundle entering the same box a join for every run of boxes they come from,
 * and every other piece stands alone. Groups come in the order of their first piece.
 */
export function groupsOf(
  spec: LayeredSpec,
  ranked: Ranked,
  layers: readonly (readonly string[])[],
  links: readonly Link[],
): Group[] {
  const bundle = new Map(spec.edges.map((e) => [e.id, e.bundle]));
  const real = (n: string) => !ranked.dummies.has(n);
  const keyed = (l: Link, end: string) => {
    const b = bundle.get(l.edge);
    return b === undefined ? undefined : `${l.gap}|${end}|${b}`;
  };
  const used = new Set<Link>();
  const groups: Group[] = [];
  const gather = (kind: 'fan' | 'join') => {
    const by = new Map<string, Link[]>();
    for (const l of links) {
      const end = kind === 'fan' ? l.upper : l.lower;
      const k = !used.has(l) && real(end) ? keyed(l, end) : undefined;
      if (k !== undefined) by.set(k, [...(by.get(k) ?? []), l]);
    }
    for (const members of by.values()) {
      const first = members[0] as Link;
      const layer = layers[first.gap + (kind === 'fan' ? 1 : 0)] ?? [];
      const other = (l: Link) => (kind === 'fan' ? l.lower : l.upper);
      for (const run of runs(members, other, layer, ranked.dummies)) {
        if (run.length < 2) continue;
        const order = (l: Link) => links.indexOf(l);
        for (const l of run) used.add(l);
        groups.push({ kind, links: [...run].sort((a, b) => order(a) - order(b)) });
      }
    }
  };
  gather('fan');
  gather('join');
  for (const l of links) if (!used.has(l)) groups.push({ kind: 'single', links: [l] });
  const first = (g: Group) => links.indexOf(g.links[0] as Link);
  return groups.sort((a, b) => first(a) - first(b));
}
