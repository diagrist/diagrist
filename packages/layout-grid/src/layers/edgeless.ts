import type { LayerEdge } from './graph.js';

/** What seating the edgeless nodes of a frame's block needs from the level the frame stands in. */
export interface Seating {
  readonly edges: readonly LayerEdge[];
  /** The frames around a node, innermost first, starting with itself. */
  readonly chain: (id: string) => readonly string[];
  /** The child of the level that holds a node, undefined outside the level. */
  readonly lift: (id: string) => string | undefined;
  /** The layer of every child of the level, as the level was laid out. */
  readonly rowOf: ReadonlyMap<string, number>;
  readonly frames: ReadonlySet<string>;
}

/**
 * The block of `frame` with every node that has edges but none inside the frame moved to the first layer of the
 * block where most of its partners stand above the frame, to the last where most stand below, else left where it
 * is. Inside its block such a node is a part of its own, which the layering puts at the top beside the first nodes,
 * so lines to it from below climbed through the whole frame (a node entered only from boxes below its frame). Only
 * nodes directly in the frame move; a layer left empty goes.
 */
export function seatEdgeless(layers: readonly (readonly string[])[], frame: string, s: Seating): string[][] {
  const out = layers.map((layer) => [...layer]);
  const at = s.rowOf.get(frame);
  if (at === undefined) return out;
  for (const v of layers.flat()) {
    if (s.frames.has(v) || s.chain(v)[1] !== frame) continue;
    const others = s.edges.flatMap((e) => (e.from === v ? [e.to] : e.to === v ? [e.from] : []));
    if (others.length === 0 || others.some((o) => s.chain(o).includes(frame))) continue;
    const rows = others.flatMap((o) => s.rowOf.get(s.lift(o) ?? '') ?? []);
    const above = rows.filter((r) => r < at).length;
    const below = rows.filter((r) => r > at).length;
    if (above === below) continue;
    const from = out.findIndex((layer) => layer.includes(v));
    const to = above > below ? 0 : out.length - 1;
    if (from === to) continue;
    out[from] = (out[from] ?? []).filter((n) => n !== v);
    out[to] = [...(out[to] ?? []), v];
  }
  return out.filter((layer) => layer.length > 0);
}
