import type { Rect } from '@diagrist/core';
import type { Xs } from './coords.js';
import type { Group, Link } from './links.js';
import type { Ports } from './ports.js';
import type { Ranked } from './rank.js';

/** A placement with the ports it gives. */
export interface Placement {
  readonly x: Xs;
  readonly flat: ReadonlyMap<string, Rect>;
  readonly ports: Ports;
}

/** What the removal of jogs needs: the layers, widths and gaps, the groups, and how ports follow a placement. */
export interface Unjogging {
  readonly layers: readonly (readonly string[])[];
  readonly width: (id: string) => number;
  readonly gap: (left: string, right: string) => number;
  readonly groups: readonly Group[];
  readonly ranked: Ranked;
  /** The ports of a placement, with the frames cleared again. */
  readonly settle: (x: Xs) => Placement;
  /** The nodes that move with `n` as a group, the boxes of its frame. */
  readonly blockOf: (n: string) => readonly string[];
  /** What the whole picture of a placement costs, drawn and measured (`scoreOf`). */
  readonly price: (p: Placement) => number;
  /** Links of chains (`spinesOf`), upper end first, which a far move may not bend. */
  readonly spines: readonly (readonly [string, string])[];
}

/** Rounds over all pieces: a move can make room for the next, such as a box moved under a line that now bends above. */
const ROUNDS = 3;

/**
 * Bends taken out by moving boxes sideways (layout plan R1, and R2 as a pass after the placement): for every piece
 * that bends, its lower box or placeholder chain moves by the offset, or its upper one, or the frame of its lower
 * end, else of its upper end, as a whole, such as a package under the line that enters it. A placeholder moves with
 * all of its chain, which keeps the chain straight. A move needs room in every layer it touches and must not bend a
 * link of a chain (`spines`); of the moves that fit, the one whose whole picture, drawn, costs least by `scoreOf`
 * stays, if it costs less than the picture before. So a box leaves the axis of its parent only where the line it
 * straightens is worth more than the centring it gives up.
 */
export function unjog(u: Unjogging, start: Placement): Placement {
  let best = start;
  let cost = u.price(start);
  const layerOf = (n: string) => u.layers[u.ranked.layerOf.get(n) ?? -1] ?? [];
  const sep = (a: string, b: string) => (u.width(a) + u.width(b)) / 2 + u.gap(a, b);
  const fits = (x: Xs, moving: readonly string[], d: number) =>
    moving.every((n) => {
      const layer = layerOf(n);
      const i = layer.indexOf(n);
      const [left, right] = [layer[i - 1], layer[i + 1]];
      const to = (x.get(n) ?? 0) + d;
      const still = (m: string | undefined) => m !== undefined && !moving.includes(m);
      return (
        (!still(left) || to >= (x.get(left as string) ?? 0) + sep(left as string, n) - 0.5) &&
        (!still(right) || to <= (x.get(right as string) ?? 0) - sep(n, right as string) + 0.5)
      );
    });
  const spineLinks = u.groups.flatMap((g) =>
    g.links.filter((l) => g.kind === 'single' && u.spines.some(([a, b]) => a === l.upper && b === l.lower)),
  );
  const bentSpines = (p: Placement) =>
    spineLinks.filter((l) => Math.abs((p.ports.top.get(l) ?? 0) - (p.ports.bottom.get(l) ?? 0)) > 0.5).length;
  const tried = (moving: readonly string[], d: number): { placement: Placement; cost: number } | undefined => {
    if (moving.length === 0 || !fits(best.x, moving, d)) return undefined;
    const x = new Map(best.x);
    for (const m of moving) x.set(m, (x.get(m) ?? 0) + d);
    const placement = u.settle(x);
    if (bentSpines(placement) > bentSpines(best)) return undefined;
    return { placement, cost: u.price(placement) };
  };
  const chainOf = (l: Link, n: string) =>
    u.ranked.dummies.has(n) ? (u.ranked.chains.get(l.edge) ?? []).slice(1, -1) : [n];
  for (let round = 0, moved = true; moved && round < ROUNDS; round++) {
    moved = false;
    for (const g of u.groups) moved = step(g) || moved;
  }
  return best;

  function step(g: Group): boolean {
    const l = g.links[0] as Link;
    const off = (best.ports.top.get(l) ?? 0) - (best.ports.bottom.get(l) ?? 0);
    if (g.kind !== 'single' || Math.abs(off) < 0.5) return false;
    const frame = (n: string) => {
      const block = u.blockOf(n);
      return block.length > 1 && !block.includes(n === l.lower ? l.upper : l.lower) ? block : [];
    };
    const tries: [readonly string[], number][] = [
      [chainOf(l, l.lower), -off],
      [chainOf(l, l.upper), off],
      [frame(l.lower), -off],
      [frame(l.upper), off],
    ];
    const options = tries.flatMap(([moving, d]) => tried(moving, d) ?? []);
    const cheapest = options.reduce<(typeof options)[number] | undefined>(
      (a, b) => (a && a.cost <= b.cost ? a : b),
      undefined,
    );
    if (cheapest === undefined || cheapest.cost >= cost) return false;
    [best, cost] = [cheapest.placement, cheapest.cost];
    return true;
  }
}
