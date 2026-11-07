import type { FramePaths } from './paths.js';

type Layers = string[][];

/** Rounds of the search for the order of sibling frames. */
const ROUNDS = 4;

/** A run of one layer at one depth: a node alone, or the nodes of one frame, at the mean of their places. */
interface Unit {
  readonly frame?: string;
  readonly nodes: string[];
  sum: number;
}

/**
 * One layer with the nodes of every frame together and sibling frames in the order of `rank`: at each depth the
 * runs, single nodes and frames, stand at the mean place of what they hold, then the frames swap into their order
 * among the places frames take, and each frame is ordered the same way inside.
 */
function grouped(layer: readonly string[], fp: FramePaths, depth: number, rank: ReadonlyMap<string, number>): string[] {
  const units = new Map<string, Unit>();
  layer.forEach((n, i) => {
    const frame = fp.paths.get(n)?.[depth];
    const key = frame === undefined ? `n:${n}` : `f:${frame}`;
    const unit = units.get(key) ?? { ...(frame === undefined ? {} : { frame }), nodes: [], sum: 0 };
    unit.nodes.push(n);
    unit.sum += i;
    units.set(key, unit);
  });
  const sorted = [...units.values()].sort((a, b) => a.sum / a.nodes.length - b.sum / b.nodes.length);
  const slots = sorted.flatMap((u, i) => (u.frame === undefined ? [] : [i]));
  const frames = slots
    .map((i) => sorted[i] as Unit)
    .sort((a, b) => (rank.get(a.frame ?? '') ?? 0) - (rank.get(b.frame ?? '') ?? 0));
  slots.forEach((slot, k) => {
    sorted[slot] = frames[k] as Unit;
  });
  return sorted.flatMap((u) => (u.frame === undefined ? u.nodes : grouped(u.nodes, fp, depth + 1, rank)));
}

/** Every layer grouped by its frames, sibling frames in the order of `rank`. */
const normalised = (layers: Layers, fp: FramePaths, rank: ReadonlyMap<string, number>): Layers =>
  layers.map((layer) => grouped(layer, fp, 0, rank));

/** What breaks the frames in an order, in parts a search reckons layer by layer and the part across the layers. */
export interface FrameBreaks {
  /** Every foreign node standing between two nodes of one frame in `layer`. */
  readonly local: (layer: readonly string[]) => number;
  /** The first place of each frame in `layer`. */
  readonly firsts: (layer: readonly string[]) => ReadonlyMap<string, number>;
  /**
   * For every pair of sibling frames, the layers in which they stand the other way round than in most: counted over
   * the first places of `others`, then for each layer `at` added to them, so a search that tries many orders of one
   * layer counts the others once. An empty `at` adds nothing.
   */
  readonly siblings: (others: readonly ReadonlyMap<string, number>[]) => (at: ReadonlyMap<string, number>) => number;
}

/**
 * What breaks the frames in an order: every foreign node standing between two nodes of one frame, and for every pair
 * of sibling frames the layers in which they stand the other way round than in most: `local` summed over the layers
 * plus `siblings` of the `firsts` of every layer. Kept in parts so a search that changes one layer reckons only it.
 */
export function frameBreaks(fp: FramePaths): FrameBreaks {
  const frames = [...fp.byId.values()];
  const pairs = frames.flatMap((f, i) =>
    frames.slice(i + 1).flatMap((g) => (f.parent === g.parent ? [[f, g] as const] : [])),
  );
  const ends = (layer: readonly string[]) => {
    const out = new Map<string, [number, number, number]>();
    layer.forEach((n, i) => {
      for (const f of fp.paths.get(n) ?? []) {
        const e = out.get(f);
        if (e === undefined) out.set(f, [i, i, 1]);
        else [e[1], e[2]] = [i, e[2] + 1];
      }
    });
    return out;
  };
  return {
    local: (layer) => {
      let total = 0;
      for (const [first, last, members] of ends(layer).values()) total += last - first + 1 - members;
      return total;
    },
    firsts: (layer) => new Map([...ends(layer)].map(([f, e]) => [f, e[0]])),
    siblings: (others) => {
      const counts = pairs.map(([f, g]) => {
        let [before, after] = [0, 0];
        for (const at of others) {
          const [a, b] = [at.get(f.id), at.get(g.id)];
          if (a === undefined || b === undefined) continue;
          if (a < b) before++;
          else after++;
        }
        return { f: f.id, g: g.id, before, after };
      });
      return (at) => {
        let total = 0;
        for (const { f, g, before, after } of counts) {
          const [a, b] = [at.get(f), at.get(g)];
          const one = a === undefined || b === undefined ? undefined : a < b;
          total += Math.min(before + (one === true ? 1 : 0), after + (one === false ? 1 : 0));
        }
        return total;
      };
    },
  };
}

/** The nodes of frame `f` turned around in every layer, each keeping the places the frame's nodes take. */
function turned(layers: Layers, fp: FramePaths, f: string): Layers {
  return layers.map((layer) => {
    const own = layer.filter((n) => fp.paths.get(n)?.includes(f));
    return own.length < 2 ? layer : layer.map((n) => (fp.paths.get(n)?.includes(f) ? (own.pop() as string) : n));
  });
}

/**
 * The order of `layers` made to keep every frame together in every layer and sibling frames in one order through all
 * the layers they share: the frames start in the order of their mean place, then each frame tries every place among
 * its siblings, as it stands and turned around, and a move stays when the order costs less.
 */
export function clustered(layers: Layers, fp: FramePaths, cost: (layers: Layers) => number): Layers {
  const place = new Map<string, number[]>();
  for (const layer of layers)
    layer.forEach((n, i) => {
      for (const f of fp.paths.get(n) ?? []) place.set(f, [...(place.get(f) ?? []), i / Math.max(1, layer.length - 1)]);
    });
  const mean = (f: string) => {
    const at = place.get(f) ?? [];
    return at.length === 0 ? 0 : at.reduce((s, v) => s + v, 0) / at.length;
  };
  const order = [...fp.byId.keys()].filter((f) => place.has(f)).sort((a, b) => mean(a) - mean(b));
  const rankOf = (o: readonly string[]) => new Map(o.map((f, i) => [f, i]));
  let best = { order, base: layers, layers: normalised(layers, fp, rankOf(order)) };
  let lowest = cost(best.layers);
  for (let round = 0, better = true; better && round < ROUNDS; round++) {
    better = false;
    for (const f of order) {
      const parent = fp.byId.get(f)?.parent;
      for (let to = 0; to < best.order.length; to++) {
        if (fp.byId.get(best.order[to] as string)?.parent !== parent) continue;
        const moved = best.order.filter((g) => g !== f);
        moved.splice(to, 0, f);
        for (const base of [best.base, turned(best.base, fp, f)]) {
          const tried = normalised(base, fp, rankOf(moved));
          const c = cost(tried);
          if (c < lowest) {
            [best, lowest, better] = [{ order: moved, base, layers: tried }, c, true];
          }
        }
      }
    }
  }
  return best.layers;
}
