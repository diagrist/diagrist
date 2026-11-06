import type { Layers } from '../layers/sift.js';

/**
 * What the length of an order is read from: the neighbours of every node, the layers of the nodes, the widths and the
 * gap between neighbours of a layer.
 */
export interface SpanInput {
  readonly adj: ReadonlyMap<string, readonly string[]>;
  readonly layerOf: ReadonlyMap<string, number>;
  readonly width: (n: string) => number;
  readonly gap: number;
  /** The weight of the piece between two nodes, the one its crossings count by. */
  readonly weight: (a: string, b: string) => number;
}

/** The estimated length across of an order, priced as the order search asks: whole, by layer, by place, by swap. */
export interface SpanPricing {
  readonly whole: (layers: Layers) => number;
  readonly near: (layers: Layers, l: number) => number;
  readonly places: (layers: Layers, l: number, n: string) => number[];
  readonly swap: (layers: Layers, l: number, i: number) => number;
}

/**
 * The length across of the pieces of an order, estimated as `lengthOf` does: the nodes of a layer side by side in
 * their order by width, `gap` apart, the row centred on 0, and each piece between neighbouring layers as long across
 * as its ends stand apart, weighted as its crossings are, so a crossing is worth as many pixels of every piece.
 * Every price changes by as much as the whole would: `near` counts the pieces at layer `l`,
 * which are all that an order of that layer moves; `places` prices a node at every place of its layer at once, since
 * every other node of the layer stands at one of two places, left or right of it; `swap` reprices only the two nodes
 * that swap, as the pair keeps its room.
 */
export function spanPricing(s: SpanInput): SpanPricing {
  const widths = new Map<string, number>();
  const width = (n: string) => {
    const known = widths.get(n);
    if (known !== undefined) return known;
    const w = s.width(n);
    widths.set(n, w);
    return w;
  };
  const rowStart = (layer: readonly string[]) => {
    let total = s.gap * Math.max(0, layer.length - 1);
    for (const n of layer) total += width(n);
    return -total / 2;
  };
  /** Where every node stands across, read layer by layer and kept while its layer holds the same order. */
  const xOf = new Map<string, number>();
  const seen = new Map<number, string[]>();
  const row = (layers: Layers, k: number) => {
    const layer = layers[k] ?? [];
    const last = seen.get(k);
    if (last !== undefined && last.length === layer.length && last.every((n, i) => layer[i] === n)) return;
    let x = rowStart(layer);
    for (const n of layer) {
      xOf.set(n, x + width(n) / 2);
      x += width(n) + s.gap;
    }
    seen.set(k, [...layer]);
  };
  const around = (layers: Layers, l: number) => {
    row(layers, l - 1);
    row(layers, l + 1);
  };
  const pieces = new Map<string, (readonly [string, number])[]>();
  for (const [n, all] of s.adj) {
    const l = s.layerOf.get(n) ?? 0;
    pieces.set(
      n,
      all.flatMap((b) => {
        const lb = s.layerOf.get(b);
        return lb === l - 1 || lb === l + 1 ? [[b, s.weight(n, b)] as const] : [];
      }),
    );
  }
  /** The length across of the pieces of `n` to the layers beside its own with `n` at `x`, each by its weight. */
  const reach = (n: string, x: number) => {
    let total = 0;
    for (const [b, w] of pieces.get(n) ?? []) total += w * Math.abs(x - (xOf.get(b) ?? 0));
    return total;
  };
  const near = (layers: Layers, l: number) => {
    around(layers, l);
    row(layers, l);
    return (layers[l] ?? []).reduce((t, n) => t + reach(n, xOf.get(n) ?? 0), 0);
  };
  const whole = (layers: Layers) => layers.reduce((t, _, l) => t + near(layers, l), 0) / 2;
  const places = (layers: Layers, l: number, n: string) => {
    const layer = layers[l] ?? [];
    const others = layer.filter((m) => m !== n);
    around(layers, l);
    const wn = width(n);
    const start = rowStart(layer);
    const lefts: number[] = [];
    let edge = start;
    for (const m of others) {
      lefts.push(edge);
      edge += width(m) + s.gap;
    }
    lefts.push(edge);
    const before = others.map((m, i) => reach(m, (lefts[i] ?? 0) + width(m) / 2));
    const after = others.map((m, i) => reach(m, (lefts[i] ?? 0) + wn + s.gap + width(m) / 2));
    let leftOf = 0;
    let rightOf = after.reduce((t, v) => t + v, 0);
    return Array.from({ length: others.length + 1 }, (_, to) => {
      if (to > 0) [leftOf, rightOf] = [leftOf + (before[to - 1] ?? 0), rightOf - (after[to - 1] ?? 0)];
      return leftOf + rightOf + reach(n, (lefts[to] ?? 0) + wn / 2);
    });
  };
  const swap = (layers: Layers, l: number, i: number) => {
    const layer = layers[l] ?? [];
    const [n, v] = [layer[i] as string, layer[i + 1] as string];
    around(layers, l);
    let left = rowStart(layer);
    for (let k = 0; k < i; k++) left += width(layer[k] as string) + s.gap;
    const [wn, wv] = [width(n), width(v)];
    const was = reach(n, left + wn / 2) + reach(v, left + wn + s.gap + wv / 2);
    const is = reach(v, left + wv / 2) + reach(n, left + wv + s.gap + wn / 2);
    return is - was;
  };
  return { whole, near, places, swap };
}
