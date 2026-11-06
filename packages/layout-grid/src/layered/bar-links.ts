import type { Neighbours } from './order.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

const key = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

/**
 * Pairs to stand on one vertical across a bar (`LayeredNode.shape`), the one that stays first: a bar grows over the
 * ends of its lines, so what hangs on it is free to stand where its line runs straight on. A node on the side with
 * fewer nodes whose only partner there is the bar pairs with the one node on the other side in its own lane, as the
 * last step of a branch with the step after the bar, or the step before the bar with the branch that stays in its
 * lane; the one that moves takes the single steps before or after it along.
 */
export function barSpines(
  spec: LayeredSpec,
  ranked: Pick<Ranked, 'layerOf'>,
  links: Neighbours,
  lane: (id: string) => number | undefined,
): [string, string][] {
  const layer = (n: string) => ranked.layerOf.get(n) ?? 0;
  return spec.nodes.flatMap((bar): [string, string][] => {
    if (bar.shape !== 'bar') return [];
    const around = links.adj.get(bar.id) ?? [];
    const above = around.filter((n) => layer(n) < layer(bar.id));
    const below = around.filter((n) => layer(n) > layer(bar.id));
    const only = (n: string, d: number) =>
      (links.adj.get(n) ?? []).filter((m) => layer(m) === layer(n) + d).every((m) => m === bar.id);
    const mates = (n: string, others: readonly string[]) => others.filter((m) => lane(m) === lane(n));
    const near = (n: string, dl: number) => (links.adj.get(n) ?? []).filter((m) => layer(m) === layer(n) + dl);
    const chain = (anchor: string, mover: string, dl: number): [string, string][] => {
      const out: [string, string][] = [[anchor, mover]];
      for (
        let [at, next] = [mover, near(mover, dl)];
        next.length === 1 && near(next[0] as string, -dl).length === 1;
      ) {
        out.push([at, next[0] as string]);
        at = next[0] as string;
        next = near(at, dl);
      }
      return out;
    };
    const fork = above.length <= below.length;
    const [movers, others, dl] = fork ? [above, below, -1] : [below, above, 1];
    return movers.flatMap((n): [string, string][] => {
      const [mate, more] = mates(n, others);
      return mate !== undefined && more === undefined && only(n, -dl) ? chain(mate, n, dl) : [];
    });
  });
}

/**
 * The links the placement pulls by in a picture with lanes: only those within one lane. A line into another lane
 * bends in the gap whatever the places, since the lanes stand side by side, so it does not pull its ends together and
 * every lane is as narrow as its own lines allow.
 */
export function withinLanes(links: Neighbours, lane: (id: string) => number | undefined): Neighbours {
  const same = (a: string, b: string) => lane(a) === undefined || lane(a) === lane(b);
  return {
    adj: new Map([...links.adj].map(([n, list]) => [n, list.filter((m) => same(n, m))])),
    weight: links.weight,
  };
}

/** How much a branch out of or into a corner pulls, against 1 for a line that must run straight. */
const CORNER_PULL = 0.001;

/**
 * The links the placement pulls by, those of the branches at a box with `sides` lightened where a long line, through
 * placeholders, is among them: of two or more pieces on its top or bottom the outer ones leave or enter it at a
 * corner, so they need not stand below it, while the long line runs straight out of its tip.
 */
export function cornerPulls(
  spec: LayeredSpec,
  ranked: Pick<Ranked, 'layerOf' | 'dummies'>,
  links: Neighbours,
): Neighbours {
  const weight = new Map(links.weight);
  for (const n of spec.nodes) {
    if (n.sides === undefined) continue;
    const l = ranked.layerOf.get(n.id) ?? 0;
    for (const dl of [-1, 1]) {
      const near = (links.adj.get(n.id) ?? []).filter((m) => ranked.layerOf.get(m) === l + dl);
      if (near.length < 2 || !near.some((m) => ranked.dummies.has(m))) continue;
      for (const m of near) {
        const k = key(n.id, m);
        if (!ranked.dummies.has(m)) weight.set(k, (links.weight.get(k) ?? 1) * CORNER_PULL);
      }
    }
  }
  return { adj: links.adj, weight };
}
