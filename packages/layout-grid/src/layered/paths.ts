import type { Ranked } from './rank.js';
import type { LayeredFrame, LayeredSpec } from './spec.js';

/** The frames of a picture as the order and the placement see them. */
export interface FramePaths {
  readonly byId: ReadonlyMap<string, LayeredFrame>;
  /** The frames around every node and placeholder, outermost first. */
  readonly paths: ReadonlyMap<string, readonly string[]>;
  /** The first and the last layer of every frame that holds a box, by its boxes. */
  readonly span: ReadonlyMap<string, readonly [number, number]>;
  /** The frame and its parents, outermost first. */
  chain(id: string | undefined): string[];
}

/** How many leading entries two paths share. */
export const prefix = (a: readonly string[], b: readonly string[]): number => {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i;
};

/**
 * The frames around every node: a box stands in the frame that lists it and in that frame's parents. A placeholder of
 * an edge stands in the frames around its upper end that reach its layer, so a line runs down inside the frame it
 * leaves as long as that frame lasts, else in those around its lower end that reach it, so a line enters its target's
 * frame where that begins, else in the frames both ends share. Where a frame beside those lies wholly between the
 * layers of the ends, the line runs through it rather than around it (layout plan R5, owner decision D2), and the
 * placeholder stands in that frame too; otherwise a line crosses the border of a frame only where it leaves or enters
 * it.
 */
export function framePaths(spec: LayeredSpec, ranked: Ranked): FramePaths {
  const list = spec.frames ?? [];
  const byId = new Map(list.map((f) => [f.id, f]));
  const chain = (id: string | undefined): string[] => {
    const out: string[] = [];
    for (let f = id; f !== undefined && byId.has(f) && !out.includes(f); f = byId.get(f)?.parent) out.unshift(f);
    return out;
  };
  const home = new Map(list.flatMap((f) => f.members.map((n) => [n, f.id] as const)));
  const paths = new Map<string, readonly string[]>(
    [...ranked.layerOf.keys()].map((n) => [n, ranked.dummies.has(n) ? [] : chain(home.get(n))]),
  );
  const span = new Map<string, [number, number]>();
  for (const [n, l] of ranked.layerOf) {
    if (ranked.dummies.has(n)) continue;
    for (const f of paths.get(n) ?? []) {
      const s = span.get(f);
      span.set(f, [Math.min(s?.[0] ?? l, l), Math.max(s?.[1] ?? l, l)]);
    }
  }
  const reaching = (path: readonly string[], l: number) => {
    let i = 0;
    while (
      i < path.length &&
      (span.get(path[i] as string)?.[0] ?? l + 1) <= l &&
      l <= (span.get(path[i] as string)?.[1] ?? -1)
    )
      i++;
    return path.slice(0, i);
  };
  /** A frame beside the frames both ends share that spans layer `l` and lies wholly between the ends' layers. */
  const between = (nodes: readonly string[], shared: readonly string[], l: number) => {
    const [top, bottom] = [
      ranked.layerOf.get(nodes[0] as string) ?? 0,
      ranked.layerOf.get(nodes.at(-1) as string) ?? 0,
    ];
    return list.find((f) => {
      const [first, last] = span.get(f.id) ?? [-1, -1];
      return f.parent === shared.at(-1) && first > top && last < bottom && first <= l && l <= last;
    })?.id;
  };
  for (const [edge, nodes] of ranked.chains) {
    const [a, b] = [paths.get(nodes[0] as string) ?? [], paths.get(nodes.at(-1) as string) ?? []];
    const shared = a.slice(0, prefix(a, b));
    for (const d of nodes.slice(1, -1)) {
      if (!d.startsWith(`d:${edge}:`)) continue;
      const l = ranked.layerOf.get(d) ?? 0;
      const [up, low] = [reaching(a, l), reaching(b, l)];
      const across = between(nodes, shared, l);
      paths.set(
        d,
        up.length > shared.length ? up : low.length > shared.length ? low : across ? [...shared, across] : shared,
      );
    }
  }
  return { byId, paths, span, chain };
}
