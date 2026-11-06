import type { FramePaths } from './paths.js';
import type { Ranked } from './rank.js';

type Layers = string[][];

/**
 * An order with the placeholders of one long edge moved together to the left or right end of what they stand among,
 * in every layer at once: the start or the end of the run of their frame, or of the layer outside frames. A move
 * stays when the order costs less. Moving one placeholder at a time cannot find such an order, since each single
 * step bends the edge across its neighbours.
 */
export function chainsAside(
  layers: Layers,
  ranked: Ranked,
  fp: FramePaths | undefined,
  cost: (l: Layers) => number,
): Layers {
  let best = layers;
  let lowest = cost(best);
  for (const chain of ranked.chains.values()) {
    const held = chain.filter((n) => ranked.dummies.has(n));
    if (held.length < 2) continue;
    for (const end of ['left', 'right'] as const) {
      const tried = best.map((layer) => {
        const d = held.find((n) => layer.includes(n));
        if (d === undefined) return layer;
        const frame = fp?.paths.get(d)?.at(-1);
        const rest = layer.filter((n) => n !== d);
        const run = rest.flatMap((n, i) => (frame === undefined || fp?.paths.get(n)?.includes(frame) ? [i] : []));
        const at = run.length === 0 ? 0 : end === 'left' ? (run[0] as number) : (run.at(-1) as number) + 1;
        rest.splice(at, 0, d);
        return rest;
      });
      const c = cost(tried);
      if (c < lowest) [best, lowest] = [tried, c];
    }
  }
  return best;
}
