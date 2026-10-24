import { casesOf, families, type Parts } from './parts.js';

/** Up to this many subjects the order tries every permutation (6! = 720). */
const EXHAUSTIVE = 6;
/** Every subject a line between actor and use case has to cross weighs more than a row of distance. */
const SKIPPED = 10;

/** All orders of 0 to n-1 in lexicographic sequence, the declaration order first. */
function* permutations(n: number): Generator<number[]> {
  const a = Array.from({ length: n }, (_, i) => i);
  const at = (i: number) => a[i] ?? 0;
  for (;;) {
    yield [...a];
    let i = n - 2;
    while (i >= 0 && at(i) >= at(i + 1)) i--;
    if (i < 0) return;
    let j = n - 1;
    while (at(j) <= at(i)) j--;
    [a[i], a[j]] = [at(j), at(i)];
    a.splice(i + 1, n - i - 1, ...a.slice(i + 1).reverse());
  }
}

/**
 * Order of subjects side by side, `perRow` per row of the grid: subjects sharing an actor stand next to each other,
 * so it stands in the lane between them and no line crosses a third subject. On a tie the declaration order stays.
 * Only the `count` subjects move; use cases without subject and actors keep their number from `band`.
 */
export function bandOrder(
  p: Parts,
  band: (id: string) => number,
  count: number,
  perRow: number,
): (id: string) => number {
  const spans = families(p)
    .map((members) => [...new Set(members.flatMap((id) => casesOf(id, p).map(band)))].filter((b) => b < count))
    .filter((bands) => bands.length > 1);
  if (!spans.length || count > EXHAUSTIVE) return band;
  const cost = (at: readonly number[]) =>
    spans.reduce((sum, bands) => {
      const cols = bands.map((b) => (at[b] ?? 0) % perRow);
      const rows = bands.map((b) => Math.floor((at[b] ?? 0) / perRow));
      const wide = Math.max(...cols) - Math.min(...cols);
      return sum + SKIPPED * Math.max(0, wide - 1) + Math.max(...rows) - Math.min(...rows);
    }, 0);
  let best: number[] = [];
  let bestCost = Number.POSITIVE_INFINITY;
  for (const order of permutations(count)) {
    const at = order.map((_, b) => order.indexOf(b));
    const c = cost(at);
    if (c < bestCost) {
      best = at;
      bestCost = c;
    }
  }
  return (id) => {
    const b = band(id);
    return b < count ? (best[b] ?? b) : b;
  };
}
