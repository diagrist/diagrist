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

/** A jog shorter than this reads as a slip (the line check's limit for lines into a head). */
const JOG = 24;

/** The pieces that bend, and of them those that bend by less than `JOG`. */
function score(groups: readonly Group[], ports: Ports): [number, number] {
  const singles = groups.flatMap((g) => (g.kind === 'single' ? [g.links[0] as Link] : []));
  const offs = singles.map((l) => Math.abs((ports.bottom.get(l) ?? 0) - (ports.top.get(l) ?? 0)));
  return [offs.filter((d) => d > 0.5).length, offs.filter((d) => d > 0.5 && d < JOG).length];
}

const better = (a: [number, number], b: [number, number]) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);

/**
 * Bends taken out by moving boxes sideways (layout plan R1, and R2 as a pass after the placement): for every piece
 * whose ends stand less than `JOG` apart, its lower box, else its upper box, moves by the jog. A piece that bends by
 * more moves the same way, a placeholder chain first, so a box the pull of placeholders took away from its real
 * neighbour comes back under it; such a move must not bend a link of a chain (`spines`) and stays only when the
 * whole picture, drawn, costs no more by `scoreOf`. For any bent piece, the frame of its lower end, else of its
 * upper end, moves as a whole, such as a package under the line that enters it. A move needs room in every layer
 * and stays when fewer pieces bend after it, or as many with fewer small jogs. A placeholder moves with all of its
 * chain, which keeps the chain straight.
 */
export function unjog(u: Unjogging, start: Placement): Placement {
  let best = start;
  let scored = score(u.groups, start.ports);
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
  let cost: number | undefined;
  const attempt = (moving: readonly string[], d: number, priced: boolean): boolean => {
    if (moving.length === 0 || !fits(best.x, moving, d)) return false;
    const x = new Map(best.x);
    for (const m of moving) x.set(m, (x.get(m) ?? 0) + d);
    const tried = u.settle(x);
    const s = score(u.groups, tried.ports);
    if (!better(s, scored)) return false;
    if (priced && bentSpines(tried) > bentSpines(best)) return false;
    const after = priced ? u.price(tried) : undefined;
    if (after !== undefined) cost ??= u.price(best);
    if (after !== undefined && after > (cost ?? after)) return false;
    [best, scored, cost] = [tried, s, after];
    return true;
  };
  const placeholders = (moving: readonly string[]) => moving.filter((n) => u.ranked.dummies.has(n)).length;
  const chainOf = (l: Link, n: string) =>
    u.ranked.dummies.has(n) ? (u.ranked.chains.get(l.edge) ?? []).slice(1, -1) : [n];
  for (const g of u.groups) {
    const l = g.links[0] as Link;
    const off = (best.ports.top.get(l) ?? 0) - (best.ports.bottom.get(l) ?? 0);
    if (g.kind !== 'single' || Math.abs(off) < 0.5) continue;
    const small = Math.abs(off) < JOG;
    const frame = (n: string) => {
      const block = u.blockOf(n);
      return block.length > 1 && !block.includes(n === l.lower ? l.upper : l.lower) ? block : [];
    };
    const near: [readonly string[], number, boolean][] = [
      [chainOf(l, l.lower), -off, !small],
      [chainOf(l, l.upper), off, !small],
    ];
    const tries: [readonly string[], number, boolean][] = [
      ...(small ? near : [...near].sort((a, b) => placeholders(b[0]) - placeholders(a[0]))),
      [frame(l.lower), -off, false],
      [frame(l.upper), off, false],
    ];
    tries.some(([moving, d, priced]) => attempt(moving, d, priced));
  }
  return best;
}
