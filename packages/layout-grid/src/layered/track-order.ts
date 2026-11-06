/** A piece's extent along its gap, left end and right end. */
interface Span {
  readonly x1: number;
  readonly x2: number;
}

/**
 * The pairs of `spans` that `overlap` holds for, found by a sweep along the gap instead of testing every pair: the
 * spans sorted by their left end, each tested only against those that start before it ends plus `reach`, the widest
 * distance at which `overlap` can still hold. Returns for every span the indices of the others it meets, ascending.
 */
export function meeting<T extends Span>(
  spans: readonly T[],
  overlap: (a: T, b: T) => boolean,
  reach: number,
): number[][] {
  const out = spans.map((): number[] => []);
  const byLeft = spans.map((_, i) => i).sort((a, b) => (spans[a] as T).x1 - (spans[b] as T).x1 || a - b);
  for (const [k, i] of byLeft.entries()) {
    const a = spans[i] as T;
    for (let j = k + 1; j < byLeft.length; j++) {
      const at = byLeft[j] as number;
      const b = spans[at] as T;
      if (b.x1 >= a.x2 + reach) break;
      if (!overlap(a, b)) continue;
      out[i]?.push(at);
      out[at]?.push(i);
    }
  }
  for (const list of out) list.sort((a, b) => a - b);
  return out;
}

/**
 * The greedy order of `assignTracks`, from the top: next comes the span still left whose cost is lowest, ties to the
 * leftmost left end, then right end, then the earliest given. The cost of a span is the sum of `weigh` over the
 * spans left that it meets; it is kept per span and lowered as spans leave, so a gap of n spans costs n² steps at
 * most instead of n³. `weigh` counts whole crossings, so the sums are exact and the order is the one a fresh count
 * per step gives.
 */
export function greedyOrder<T extends Span>(
  spans: readonly T[],
  meets: readonly (readonly number[])[],
  weigh: (a: T, b: T) => number,
): number[] {
  const weights = spans.map((p, i) => (meets[i] ?? []).map((j) => weigh(p, spans[j] as T)));
  const cost = weights.map((w) => w.reduce((s, v) => s + v, 0));
  const left = new Set(spans.map((_, i) => i));
  const order: number[] = [];
  while (left.size > 0) {
    let best = -1;
    for (const i of left) {
      if (best < 0) best = i;
      const [p, q] = [spans[i] as T, spans[best] as T];
      const d = (cost[i] as number) - (cost[best] as number) || p.x1 - q.x1 || p.x2 - q.x2;
      if (d < 0) best = i;
    }
    order.push(best);
    left.delete(best);
    for (const j of meets[best] ?? []) {
      if (!left.has(j)) continue;
      const at = (meets[j] ?? []).indexOf(best);
      cost[j] = (cost[j] as number) - ((weights[j] ?? [])[at] ?? 0);
    }
  }
  return order;
}
