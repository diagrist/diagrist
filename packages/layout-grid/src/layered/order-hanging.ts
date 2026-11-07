import type { Neighbours } from './order.js';
import type { Ranked } from './rank.js';

/** What the order of hanging rows is built from: the layers and the links, and the widths and gap of the boxes. */
export interface HangingInput {
  readonly ranked: Ranked;
  readonly links: Neighbours;
  readonly width: (n: string) => number;
  readonly gap: number;
}

/** The centres of the nodes of a layer side by side, `gap` apart, the row centred on 0, as the order estimates them. */
function centres(layer: readonly string[], width: (n: string) => number, gap: number): number[] {
  const total = layer.reduce((t, n) => t + width(n), 0) + gap * Math.max(0, layer.length - 1);
  let x = -total / 2;
  return layer.map((n) => {
    const c = x + width(n) / 2;
    x += width(n) + gap;
    return c;
  });
}

/**
 * Where a placeholder put before the `i`-th of `others` would stand: in the middle of the gap left of it, or a gap
 * beyond the first or the last.
 */
function slots(others: readonly string[], width: (n: string) => number, gap: number): number[] {
  const cs = centres(others, width, gap);
  const left = (i: number) => (cs[i] ?? 0) - width(others[i] as string) / 2;
  const right = (i: number) => (cs[i] ?? 0) + width(others[i] as string) / 2;
  return Array.from({ length: others.length + 1 }, (_, i) =>
    i === 0 ? left(0) - gap : i === others.length ? right(i - 1) + gap : (right(i - 1) + left(i)) / 2,
  );
}

/**
 * The slots of `targets` in order, each in a slot of its own, as near as all together can stand to their targets: a
 * monotone matching, solved by dynamic programming. On a tie the later slots win, so a hanging row follows the row
 * above it in reading order.
 */
function matched(targets: readonly number[], at: readonly number[]): number[] {
  const cost = targets.map(() => at.map(() => Number.POSITIVE_INFINITY));
  const from = targets.map(() => at.map(() => -1));
  targets.forEach((t, j) => {
    const row = cost[j] as number[];
    const prior = cost[j - 1];
    let best = prior === undefined ? 0 : Number.POSITIVE_INFINITY;
    let arg = -1;
    at.forEach((x, i) => {
      if (best < Number.POSITIVE_INFINITY) [row[i], (from[j] as number[])[i]] = [best + Math.abs(x - t), arg];
      if (prior !== undefined && (prior[i] ?? Number.POSITIVE_INFINITY) <= best) [best, arg] = [prior[i] ?? best, i];
    });
  });
  const last = cost.at(-1) ?? [];
  let i = last.reduce((b, c, k) => (c <= (last[b] ?? Number.POSITIVE_INFINITY) ? k : b), 0);
  const out: number[] = [];
  for (let k = targets.length - 1; k >= 0; k--) {
    out.unshift(i);
    i = from[k]?.[i] ?? -1;
  }
  return out;
}

/**
 * An order in which the placeholders of a layer whose lower ends hang from them alone, a row of boxes held by long
 * edges and nothing else, take gaps of their own: in the order of their lower ends, each into the gap nearest where
 * the order estimates its lower end, the other nodes of the layer kept in their order. Two such placeholders in one
 * gap stand closer than the boxes below them can, and the lines into the row then bend round each other; the order
 * searches cannot part them, as each single move of one placeholder crosses its neighbour. Undefined where nothing
 * moves; the caller lays it out beside the others and keeps it where its drawing trades better (`laidOut`).
 */
export function hangingOrder(s: HangingInput, layers: readonly (readonly string[])[]): string[][] | undefined {
  const { ranked, links, width, gap } = s;
  const out = layers.map((l) => [...l]);
  const lowerEnd = (d: string, side: number) =>
    (links.adj.get(d) ?? []).find(
      (b) =>
        !ranked.dummies.has(b) &&
        ranked.layerOf.get(b) === (ranked.layerOf.get(d) ?? 0) + side &&
        (links.adj.get(b) ?? []).length === 1,
    );
  out.forEach((layer, l) => {
    for (const side of [1, -1]) {
      const below = out[l + side];
      if (below === undefined) continue;
      const hanging = layer
        .filter((n) => ranked.dummies.has(n) && lowerEnd(n, side) !== undefined)
        .sort((a, b) => below.indexOf(lowerEnd(a, side) as string) - below.indexOf(lowerEnd(b, side) as string));
      const others = layer.filter((n) => !hanging.includes(n));
      if (hanging.length === 0 || others.length === 0 || hanging.length > others.length + 1) continue;
      const xs = centres(below, width, gap);
      const targets = hanging.map((d) => xs[below.indexOf(lowerEnd(d, side) as string)] ?? 0);
      const at = matched(targets, slots(others, width, gap));
      const next = [...others];
      at.forEach((i, k) => {
        next.splice(i + k, 0, hanging[k] as string);
      });
      layer.splice(0, layer.length, ...next);
    }
  });
  return out.every((l, i) => l.every((n, k) => layers[i]?.[k] === n)) ? undefined : out;
}
