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

/**
 * What breaks the frames in an order: every foreign node standing between two nodes of one frame, and for every pair
 * of sibling frames the layers in which they stand the other way round than in most.
 */
export function framesBroken(layers: readonly (readonly string[])[], fp: FramePaths): number {
  let total = 0;
  const firsts: Map<string, number>[] = [];
  for (const layer of layers) {
    const ends = new Map<string, [number, number, number]>();
    layer.forEach((n, i) => {
      for (const f of fp.paths.get(n) ?? []) {
        const e = ends.get(f);
        if (e === undefined) ends.set(f, [i, i, 1]);
        else [e[1], e[2]] = [i, e[2] + 1];
      }
    });
    for (const [first, last, members] of ends.values()) total += last - first + 1 - members;
    firsts.push(new Map([...ends].map(([f, e]) => [f, e[0]])));
  }
  const frames = [...fp.byId.values()];
  frames.forEach((f, i) => {
    for (const g of frames.slice(i + 1)) {
      if (f.parent !== g.parent) continue;
      let [before, after] = [0, 0];
      for (const at of firsts) {
        const [a, b] = [at.get(f.id), at.get(g.id)];
        if (a === undefined || b === undefined) continue;
        if (a < b) before++;
        else after++;
      }
      total += Math.min(before, after);
    }
  });
  return total;
}

/**
 * The order of `layers` made to keep every frame together in every layer and sibling frames in one order through all
 * the layers they share: the frames start in the order of their mean place, then each frame tries every place among
 * its siblings, and a move stays when the order costs less.
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
  let best = { order, layers: normalised(layers, fp, rankOf(order)) };
  let lowest = cost(best.layers);
  for (let round = 0, better = true; better && round < ROUNDS; round++) {
    better = false;
    for (const f of order) {
      const parent = fp.byId.get(f)?.parent;
      for (let to = 0; to < best.order.length; to++) {
        if (fp.byId.get(best.order[to] as string)?.parent !== parent) continue;
        const moved = best.order.filter((g) => g !== f);
        moved.splice(to, 0, f);
        const tried = normalised(layers, fp, rankOf(moved));
        const c = cost(tried);
        if (c < lowest) {
          [best, lowest, better] = [{ order: moved, layers: tried }, c, true];
        }
      }
    }
  }
  return best.layers;
}
