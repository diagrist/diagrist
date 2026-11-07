import type { Adjacency, Layers, OrderCost } from '../layers/sift.js';
import { frameBreaks } from './clusters.js';
import { PINNED } from './order-cost.js';
import { firstBroken } from './order-first.js';
import { inversions } from './order-terms.js';
import type { FramePaths } from './paths.js';

/** Layers whose break counts the cache keeps before it starts again. */
const KEPT = 4096;

/** What an order breaks: frames, lanes out of their order, pairs of an edge beside out of the order they ask. */
export interface Breaks {
  /** Whether anything can break at all; where not, the cost is left as it is. */
  readonly any: boolean;
  /** How often `layers` breaks a frame, a lane or a pair. */
  readonly out: (layers: Layers) => number;
  /** The same for `layers` with layer `l` replaced by each of `candidates`, the other layers reckoned once. */
  readonly replaced: (layers: Layers, l: number, candidates: readonly string[][]) => number[];
}

/**
 * The breaks of an order by frames (`fp`), lanes (`lane`, where the picture has lanes) and pairs of an edge beside
 * (`pairs`). All of them but the order of sibling frames are counted per layer; a layer's counts are kept by its
 * order, since a search asks the same layers again and again.
 */
export function breaksOf(
  fp: FramePaths | undefined,
  lane: ReadonlyMap<string, number> | undefined,
  pairs: readonly (readonly [string, string])[],
): Breaks {
  const frames = fp === undefined ? undefined : frameBreaks(fp);
  const known = new Map<string, { local: number; firsts: ReadonlyMap<string, number> }>();
  const none: ReadonlyMap<string, number> = new Map();
  const of = (layer: readonly string[]) => {
    const key = layer.join('\n');
    let got = known.get(key);
    if (got === undefined) {
      if (known.size >= KEPT) known.clear();
      got = {
        local:
          (frames?.local(layer) ?? 0) +
          (lane === undefined ? 0 : inversions(layer, lane)) +
          firstBroken([[...layer]], pairs),
        firsts: frames?.firsts(layer) ?? none,
      };
      known.set(key, got);
    }
    return got;
  };
  const siblings = (others: readonly ReadonlyMap<string, number>[]) => frames?.siblings(others) ?? (() => 0);
  return {
    any: fp !== undefined || lane !== undefined || pairs.length > 0,
    out: (layers) => {
      const counts = layers.map(of);
      return counts.reduce((sum, c) => sum + c.local, 0) + siblings(counts.map((c) => c.firsts))(none);
    },
    replaced: (layers, l, candidates) => {
      const others = layers.flatMap((layer, k) => (k === l ? [] : [of(layer)]));
      const rest = others.reduce((sum, c) => sum + c.local, 0);
      const across = siblings(others.map((c) => c.firsts));
      return candidates.map((layer) => {
        const c = of(layer);
        return rest + c.local + across(c.firsts);
      });
    },
  };
}

/**
 * `c` with every break of `breaks` added at `PINNED` each, to the whole cost and to the parts a search within one
 * layer asks: `near`, and `places` and `swap` where `c` has them, each with the break counts of the one layer that
 * changes.
 */
export function framedCost(
  c: OrderCost,
  breaks: Breaks,
  adj: Adjacency,
  layerOf: ReadonlyMap<string, number>,
): OrderCost {
  if (!breaks.any) return c;
  const near = c.near as NonNullable<OrderCost['near']>;
  const { places, swap } = c;
  const broken = (layers: Layers) => PINNED * breaks.out(layers);
  const replaced = (layers: Layers, l: number, candidates: readonly string[][]) =>
    breaks.replaced(layers, l, candidates).map((n) => PINNED * n);
  return Object.assign((layers: Layers) => c(layers, adj, layerOf) + broken(layers), {
    near: (layers: Layers, l: number) => near(layers, l) + broken(layers),
    ...(places === undefined
      ? {}
      : {
          places: (layers: Layers, l: number, n: string) => {
            const others = (layers[l] ?? []).filter((m) => m !== n);
            const candidates = Array.from({ length: others.length + 1 }, (_, to) => [
              ...others.slice(0, to),
              n,
              ...others.slice(to),
            ]);
            const extra = replaced(layers, l, candidates);
            return places(layers, l, n).map((v, to) => v + (extra[to] ?? 0));
          },
        }),
    ...(swap === undefined
      ? {}
      : {
          swap: (layers: Layers, l: number, i: number) => {
            const layer = layers[l] ?? [];
            const turned = [...layer.slice(0, i), layer[i + 1] as string, layer[i] as string, ...layer.slice(i + 2)];
            const [was, is] = replaced(layers, l, [layer, turned]);
            return swap(layers, l, i) + (is ?? 0) - (was ?? 0);
          },
        }),
  });
}
