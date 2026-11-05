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
 * Bends taken out by moving boxes sideways: for every piece whose ends stand less than `JOG` apart, its lower box,
 * else its upper box, moves by the jog; for any bent piece, the frame of its lower end, else of its upper end, moves
 * as a whole, such as a package under the line that enters it. A move needs room in every layer and stays when fewer
 * pieces bend after it, or as many with fewer small jogs. A placeholder moves with all of its chain, which keeps the
 * chain straight.
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
  const attempt = (moving: readonly string[], d: number): boolean => {
    if (moving.length === 0 || !fits(best.x, moving, d)) return false;
    const x = new Map(best.x);
    for (const m of moving) x.set(m, (x.get(m) ?? 0) + d);
    const tried = u.settle(x);
    const s = score(u.groups, tried.ports);
    if (!better(s, scored)) return false;
    [best, scored] = [tried, s];
    return true;
  };
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
    const near: [readonly string[], number][] = [
      [chainOf(l, l.lower), -off],
      [chainOf(l, l.upper), off],
    ];
    const tries: [readonly string[], number][] = [
      ...(small ? near : []),
      [frame(l.lower), -off],
      [frame(l.upper), off],
    ];
    tries.some(([moving, d]) => attempt(moving, d));
  }
  return best;
}
