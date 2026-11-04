interface Block {
  readonly sum: number;
  readonly weight: number;
  readonly size: number;
}

/**
 * The places that minimise Σ w_i (x_i − d_i)² with x_{i+1} ≥ x_i + sep_i: pool adjacent violators on the places
 * minus the separations summed up to them, which turns the gaps into a plain order.
 */
export function isotoneApart(
  desired: readonly number[],
  weights: readonly number[],
  seps: readonly number[],
): number[] {
  const offset = [0];
  for (const s of seps) offset.push((offset.at(-1) as number) + s);
  const blocks: Block[] = [];
  desired.forEach((d, i) => {
    const w = weights[i] as number;
    blocks.push({ sum: (d - (offset[i] as number)) * w, weight: w, size: 1 });
    while (blocks.length > 1) {
      const b = blocks.at(-1) as Block;
      const a = blocks.at(-2) as Block;
      if (a.sum / a.weight <= b.sum / b.weight) break;
      blocks.splice(-2, 2, { sum: a.sum + b.sum, weight: a.weight + b.weight, size: a.size + b.size });
    }
  });
  return blocks
    .flatMap((b) => Array.from({ length: b.size }, () => b.sum / b.weight))
    .map((y, i) => y + (offset[i] as number));
}
