type Layers = readonly (readonly string[])[];
type Adjacency = ReadonlyMap<string, readonly string[]>;

const PASSES = 4;
/** Nodes without neighbours in the direction of a pass only keep their distances. */
const LOOSE = 0.001;

interface Block {
  readonly sum: number;
  readonly weight: number;
  readonly size: number;
}

/** Minimises the sum of w_i (p_i - d_i)^2 with p_{i+1} >= p_i + 1 (pool adjacent violators), in half steps. */
function isotone(desired: readonly number[], weights: readonly number[]): number[] {
  const blocks: Block[] = [];
  desired.forEach((d, i) => {
    const w = weights[i] as number;
    blocks.push({ sum: (d - i) * w, weight: w, size: 1 });
    while (blocks.length > 1) {
      const b = blocks.at(-1) as Block;
      const a = blocks.at(-2) as Block;
      if (a.sum / a.weight <= b.sum / b.weight) break;
      blocks.splice(-2, 2, { sum: a.sum + b.sum, weight: a.weight + b.weight, size: a.size + b.size });
    }
  });
  return blocks
    .flatMap((b) => Array.from({ length: b.size }, () => Math.round((2 * b.sum) / b.weight) / 2))
    .map((q, i) => q + i);
}

/**
 * Nodes without a reference in this direction join their left neighbour (leading ones their right one) instead of
 * staying put; otherwise they drift further with every pass.
 */
function anchorLoose(desired: readonly (number | undefined)[], current: readonly number[]): number[] {
  const out = [...desired];
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    if (out[i] === undefined && prev !== undefined) out[i] = prev + 1;
  }
  for (let i = out.length - 2; i >= 0; i--) {
    const next = out[i + 1];
    if (out[i] === undefined && next !== undefined) out[i] = next - 1;
  }
  return out.map((d, i) => d ?? (current[i] as number));
}

function pass(
  layers: Layers,
  adj: Adjacency,
  layerOf: ReadonlyMap<string, number>,
  pos: Map<string, number>,
  down: boolean,
): void {
  const order = layers.map((_, i) => (down ? i : layers.length - 1 - i));
  const of = (n: string) => pos.get(n) ?? 0;
  for (const l of order) {
    const layer = layers[l] ?? [];
    const refs = layer.map((n) =>
      (adj.get(n) ?? []).filter((m) => {
        const k = layerOf.get(m) ?? 0;
        return down ? k < l : k > l;
      }),
    );
    const desired = anchorLoose(
      refs.map((r) => (r.length ? r.reduce((s, m) => s + of(m), 0) / r.length : undefined)),
      layer.map(of),
    );
    const weights = refs.map((r) => (r.length ? r.length : LOOSE));
    isotone(desired, weights).forEach((p, i) => {
      pos.set(layer[i] as string, p);
    });
  }
}

/**
 * Column per node: as close as possible above or below the mean of its neighbours, keeping the order and at least
 * one column apart, rounded to half columns so a parent can stand between two children.
 */
export function positions(layers: Layers, adj: Adjacency, layerOf: ReadonlyMap<string, number>): Map<string, number> {
  const pos = new Map(layers.flatMap((layer) => layer.map((n, i) => [n, i] as const)));
  for (let i = 0; i < PASSES; i++) pass(layers, adj, layerOf, pos, i % 2 === 0);
  const min = Math.min(...pos.values());
  return new Map([...pos].map(([n, p]) => [n, p - min]));
}
