import type { Xs } from './coords.js';
import type { Group, Link } from './links.js';
import type { Ranked } from './rank.js';

/** What a symmetric fan or join needs: the ranks, the links of chains and the lane of a node, if any. */
export interface SymmetryInput {
  readonly groups: readonly Group[];
  readonly ranked: Ranked;
  /** Links of chains (`spinesOf`), upper end first. */
  readonly spines: readonly (readonly [string, string])[];
  /** The lane a node stands in; undefined without lanes. */
  readonly lane?: (id: string) => number | undefined;
}

/** A fan or join priced for its symmetry: the box all its lines share and the real boxes at their other ends. */
interface Shared {
  readonly group: Group;
  readonly node: string;
  readonly members: readonly string[];
}

/** The symmetry of fans and joins, as a price and as moves. */
export interface Symmetry {
  /** What the shared boxes off the middle of their members cost in `x`, half a unit per pixel. */
  readonly cost: (x: Xs) => number;
  /**
   * The move that brings the shared box of `g` to the middle of its members in `x`: that box and its straight
   * column, the links of chains hanging below a join or above a fan within its lane, and by how much; none where `g`
   * is no priced fan or join or stands in the middle.
   */
  readonly move: (g: Group, x: Xs) => readonly [readonly string[], number] | undefined;
}

/** Half a unit per pixel, as `scoreOf` prices a box off the middle of its children. */
const PER_OFFSET = 0.5;

/**
 * The fans and joins whose shared box stands off the middle of its members (layout plan, `ausdehnung`): a merge
 * pulled under one branch by the placeholders of the other, which the placement weighs eight times a box. Priced are
 * only fans and joins with a placeholder among their pieces, so only those the pull of placeholders can take off the
 * middle, whose lines all run down, of two or more real members, a placeholder followed to the real end of its line,
 * all in the lane of the shared box, so a line that changes lanes or runs on a rail takes no part. A parent over children of the next layer
 * keeps the place the placement and its centring gave it. The middle is the middle of the outermost members.
 */
export function symmetryOf(input: SymmetryInput): Symmetry {
  const { ranked, spines } = input;
  const lane = input.lane ?? (() => undefined);
  const realEnd = (l: Link, join: boolean): string => {
    const near = join ? l.upper : l.lower;
    if (!ranked.dummies.has(near)) return near;
    const chain = ranked.chains.get(l.edge) ?? [];
    return (join ? chain[0] : chain.at(-1)) ?? near;
  };
  const shared = input.groups.flatMap((group): Shared[] => {
    if (group.kind === 'single') return [];
    const join = group.kind === 'join';
    const first = group.links[0] as Link;
    const node = join ? first.lower : first.upper;
    const members = [...new Set(group.links.map((l) => realEnd(l, join)))];
    const pulled = group.links.some((l) => ranked.dummies.has(join ? l.upper : l.lower));
    const back = group.links.some((l) => ranked.down.get(l.edge) === false);
    const apart = members.some((m) => ranked.dummies.has(m) || lane(m) !== lane(node));
    return members.length < 2 || !pulled || back || apart ? [] : [{ group, node, members }];
  });
  const offset = (s: Shared, x: Xs) => {
    const xs = s.members.map((m) => x.get(m) ?? 0);
    return (Math.min(...xs) + Math.max(...xs)) / 2 - (x.get(s.node) ?? 0);
  };
  const column = (s: Shared): string[] => {
    const out = [s.node];
    const down = s.group.kind === 'join';
    for (let at = s.node, next: string | undefined; ; at = next) {
      next = spines.find(([a, b]) => (down ? a === at : b === at))?.[down ? 1 : 0];
      if (next === undefined || out.includes(next) || lane(next) !== lane(s.node)) return out;
      out.push(next);
    }
  };
  return {
    cost: (x) => shared.reduce((sum, s) => sum + PER_OFFSET * Math.abs(offset(s, x)), 0),
    move: (g, x) => {
      const s = shared.find((t) => t.group === g);
      if (s === undefined) return undefined;
      const d = offset(s, x);
      return Math.abs(d) < 0.5 ? undefined : [column(s), d];
    },
  };
}
