import { casesOf, families, type Parts } from './parts.js';

/** Up to this many subjects the order tries every permutation (6! = 720). */
const EXHAUSTIVE = 6;

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
 * Orders of subjects side by side, `perRow` per row of the grid, as candidates the layout prices: subjects sharing
 * an actor stand next to each other, so it stands in the lane between them and no line crosses a third subject. Of
 * the orders that skip fewest subjects, one per distinct set of columns, at most `most`; those that spread the
 * subjects of an actor over fewest rows first, the declaration order first on a tie. Which subjects share a column,
 * and so which stand below each other, only a layout shows: the rows of the grid are what the layout graph makes of
 * them, so an estimate by rows alone may keep a crossing or a line through a foreign subject that another set of
 * columns spares. Only the `count` subjects move; use cases without subject and actors keep their number from
 * `band`.
 */
export function bandOrders(
  p: Parts,
  band: (id: string) => number,
  count: number,
  perRow: number,
  most: number,
): ((id: string) => number)[] {
  const spans = families(p)
    .map((members) => [...new Set(members.flatMap((id) => casesOf(id, p).map(band)))].filter((b) => b < count))
    .filter((bands) => bands.length > 1);
  if (!spans.length || count > EXHAUSTIVE) return [band];
  const spread = (at: readonly number[], of: (at: number) => number, by: number) =>
    spans.reduce((sum, bands) => {
      const v = bands.map((b) => of(at[b] ?? 0));
      return sum + Math.max(0, Math.max(...v) - Math.min(...v) - by);
    }, 0);
  const tried = [...permutations(count)].map((order) => {
    const at = order.map((_, b) => order.indexOf(b));
    return { at, wide: spread(at, (a) => a % perRow, 1), rows: spread(at, (a) => Math.floor(a / perRow), 0) };
  });
  const least = Math.min(...tried.map((t) => t.wide));
  const seen = new Set<string>();
  const chosen = tried
    .filter((t) => t.wide === least)
    .sort((a, b) => a.rows - b.rows)
    .filter((t) => {
      const key = t.at.map((a) => a % perRow).join(' ');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, most);
  return chosen.map(({ at }) => (id: string) => {
    const b = band(id);
    return b < count ? (at[b] ?? b) : b;
  });
}
