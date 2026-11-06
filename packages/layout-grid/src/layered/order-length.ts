import type { Neighbours } from './order.js';

/**
 * Where the nodes of a layer stand across, estimated: side by side in their order by `width`, `gap` apart, the row
 * centred on 0.
 */
function centred(layer: readonly string[], width: (n: string) => number, gap: number, xs: Map<string, number>): void {
  let total = gap * Math.max(0, layer.length - 1);
  for (const n of layer) total += width(n);
  let x = -total / 2;
  for (const n of layer) {
    const w = width(n);
    xs.set(n, x + w / 2);
    x += w + gap;
  }
}

/** What the length of the pieces is read from: the links, the layers of the nodes, the widths and which pieces count. */
export interface Lengths {
  readonly links: Neighbours;
  readonly layerOf: ReadonlyMap<string, number>;
  readonly width: (n: string) => number;
  readonly gap: number;
  /** What the piece between two nodes weighs, 0 where it does not count. */
  readonly counts: (a: string, b: string) => number;
}

/** The estimated widths the counted pieces of layer `l` span to the layers above and below (`centred`). */
function spanOf(layers: readonly (readonly string[])[], l: number, c: Lengths): number {
  const xs = new Map<string, number>();
  for (const k of [l - 1, l, l + 1]) centred(layers[k] ?? [], c.width, c.gap, xs);
  let total = 0;
  for (const a of layers[l] ?? [])
    for (const b of c.links.adj.get(a) ?? []) {
      const lb = c.layerOf.get(b);
      if (lb === l - 1 || lb === l + 1) total += c.counts(a, b) * Math.abs((xs.get(a) ?? 0) - (xs.get(b) ?? 0));
    }
  return total;
}

/** The estimated widths all counted pieces of an order span, each counted once. */
export function lengthOf(layers: readonly (readonly string[])[], c: Lengths): number {
  return layers.reduce((sum, _, l) => sum + spanOf(layers, l, c), 0) / 2;
}
