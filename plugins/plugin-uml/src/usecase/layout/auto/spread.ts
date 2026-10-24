/**
 * Positions as close to the wishes as possible, in the given order and at least `gap` apart: isotonic regression
 * (pool adjacent violators), then rounded to multiples of `step`.
 */
export function spread(desired: readonly number[], gap: number, step: number): number[] {
  const blocks: { sum: number; size: number }[] = [];
  desired.forEach((d, i) => {
    blocks.push({ sum: d - i * gap, size: 1 });
    for (let a = blocks.at(-2), b = blocks.at(-1); a && b; a = blocks.at(-2), b = blocks.at(-1)) {
      if (a.sum / a.size <= b.sum / b.size) break;
      blocks.splice(-2, 2, { sum: a.sum + b.sum, size: a.size + b.size });
    }
  });
  return blocks
    .flatMap((b) => Array.from({ length: b.size }, () => Math.round(b.sum / b.size / step) * step))
    .map((q, i) => q + i * gap);
}

/**
 * Sorts by `rank` (keys in turn, such as the subject), then by wish, on a tie by the current position, and spreads
 * with `spread`. Without a wish an element stays where it is.
 */
export function arrange(
  ids: readonly string[],
  desired: ReadonlyMap<string, number>,
  current: ReadonlyMap<string, number>,
  spacing: { readonly gap: number; readonly step: number },
  rank: (id: string) => readonly number[] = () => [],
): Map<string, number> {
  const want = (id: string) => desired.get(id) ?? current.get(id) ?? 0;
  const byRank = (a: readonly number[], b: readonly number[]): number => {
    for (let i = 0; i < Math.max(a.length, b.length); i++)
      if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) - (b[i] ?? 0);
    return 0;
  };
  const order = [...ids].sort(
    (a, b) => byRank(rank(a), rank(b)) || want(a) - want(b) || (current.get(a) ?? 0) - (current.get(b) ?? 0),
  );
  const placed = spread(order.map(want), spacing.gap, spacing.step);
  return new Map(order.map((id, i) => [id, placed[i] ?? 0]));
}
