import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** One piece at a box with a trunk: its other end and the weight it is crossed by. */
interface End {
  readonly other: string;
  readonly bundle: string | undefined;
  readonly weight: number;
}

/**
 * The pieces on one side of one box whose other ends stand in one layer, where a bundle gathers two or more of them
 * on a trunk (`members`) and other pieces leave or enter the box on that side too (`others`), one entry per trunk.
 */
export interface TrunkSite {
  readonly members: readonly End[];
  readonly others: readonly End[];
}

/**
 * The places where a trunk is crossed by a piece of its own box, by the layer of the pieces' other ends. Pieces with
 * one end in common never cross in the count of the order, but a trunk gathers its members on one horizontal in the
 * gap, so a piece of the same box whose other end stands between two members crosses that horizontal
 * (`trunkCrossings`).
 * `weightOf` is the weight of a piece by its two ends, as the order weighs its crossings.
 */
export function trunkSites(
  spec: LayeredSpec,
  ranked: Ranked,
  weightOf: (a: string, b: string) => number,
): Map<number, TrunkSite[]> {
  const sides = new Map<string, End[]>();
  for (const e of spec.edges) {
    const chain = ranked.chains.get(e.id);
    if (chain === undefined || chain.length < 2 || e.hidden === true) continue;
    for (const [box, other] of [
      [chain[0], chain[1]],
      [chain.at(-1), chain.at(-2)],
    ] as const) {
      if (box === undefined || other === undefined || ranked.dummies.has(box)) continue;
      if (ranked.layerOf.get(box) === ranked.layerOf.get(other)) continue;
      const key = `${box}|${ranked.layerOf.get(other)}`;
      const end = { other, bundle: e.bundle, weight: weightOf(box, other) };
      sides.set(key, [...(sides.get(key) ?? []), end]);
    }
  }
  const sites = new Map<number, TrunkSite[]>();
  for (const ends of sides.values()) {
    const layer = ranked.layerOf.get(ends[0]?.other ?? '') ?? 0;
    for (const b of new Set(ends.map((e) => e.bundle))) {
      const members = ends.filter((e) => e.bundle === b);
      const others = ends.filter((e) => e.bundle !== b);
      if (b === undefined || members.length < 2 || others.length === 0) continue;
      sites.set(layer, [...(sites.get(layer) ?? []), { members, others }]);
    }
  }
  return sites;
}

/**
 * The weighted crossings of trunks with pieces of their own box in one layer of other ends: for every other piece of
 * a site whose other end stands between members of its trunk, as many crossings as members stand on the nearer side
 * of it, each weighted by both pieces.
 */
export function trunkCrossings(sites: readonly TrunkSite[], at: (n: string) => number): number {
  let total = 0;
  for (const { members, others } of sites) {
    const places = members.map((m) => at(m.other));
    for (const f of others) {
      const p = at(f.other);
      let left = 0;
      let right = 0;
      let wl = 0;
      let wr = 0;
      for (let i = 0; i < members.length; i++) {
        const q = places[i] as number;
        const w = (members[i] as End).weight;
        if (q < p) {
          left++;
          wl += w;
        } else if (q > p) {
          right++;
          wr += w;
        }
      }
      if (left > 0 && right > 0) total += f.weight * (left <= right ? wl : wr);
    }
  }
  return 10 * total;
}
