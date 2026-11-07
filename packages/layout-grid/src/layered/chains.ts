import type { FramePaths } from './paths.js';
import type { Ranked } from './rank.js';
import { movingWith } from './trunks-through.js';

type Layers = string[][];

/**
 * An order with the placeholders of one long edge moved together to the left or right end of what they stand among,
 * in every layer at once: the start or the end of the run of their frame, or of the layer outside frames. A move
 * stays when the order costs less, or as much and its pieces span less by `length`. Moving one placeholder at a time
 * cannot find such an order, since each single step bends the edge across its neighbours. A trunk through the layers
 * moves with all its branches (`movingWith`), keeping their order in each layer.
 */
export function chainsAside(
  layers: Layers,
  ranked: Ranked,
  fp: FramePaths | undefined,
  cost: (l: Layers) => number,
  length: (l: Layers) => number,
): Layers {
  let best = layers;
  let lowest = cost(best);
  let shortest: number | undefined;
  const moving = movingWith(ranked);
  const seen = new Set<string>();
  for (const chain of ranked.chains.values()) {
    const held = new Set(ranked.dummies.has(chain[1] ?? '') ? moving(chain[1] as string) : []);
    const key = [...held].join(' ');
    if (held.size < 2 || seen.has(key)) continue;
    seen.add(key);
    for (const end of ['left', 'right'] as const) {
      const tried = best.map((layer) => {
        const ds = layer.filter((n) => held.has(n));
        if (ds.length === 0) return layer;
        const frame = fp?.paths.get(ds[0] as string)?.at(-1);
        const rest = layer.filter((n) => !held.has(n));
        const run = rest.flatMap((n, i) => (frame === undefined || fp?.paths.get(n)?.includes(frame) ? [i] : []));
        const at = run.length === 0 ? 0 : end === 'left' ? (run[0] as number) : (run.at(-1) as number) + 1;
        rest.splice(at, 0, ...ds);
        return rest;
      });
      const c = cost(tried);
      if (c > lowest) continue;
      if (c < lowest) [best, lowest, shortest] = [tried, c, undefined];
      else {
        shortest ??= length(best);
        const l = length(tried);
        if (l < shortest) [best, shortest] = [tried, l];
      }
    }
  }
  return best;
}
