import type { LayerEdge } from './graph.js';

/** The layers of one level with its round trips beside their frames, and the frame each such node stands beside. */
export interface RoundTrips {
  readonly layers: readonly (readonly string[])[];
  readonly beside: ReadonlyMap<string, string>;
}

/**
 * The first frame a node of a level round-trips, given the edges of the level lifted to its children: a ranked edge
 * from a frame of the level to the node and one from the node back into it. Undefined where the node is a frame, has
 * an edge that wants it beside another node, or round-trips no frame.
 */
export function hostOf(v: string, edges: readonly LayerEdge[], frames: ReadonlySet<string>): string | undefined {
  const own = edges.filter((e) => e.from !== e.to && (e.from === v || e.to === v));
  if (frames.has(v) || own.some((e) => e.rank !== 1)) return undefined;
  return own.find((e) => e.to === v && frames.has(e.from) && own.some((o) => o.to === e.from))?.from;
}

/**
 * The layers of one level with the round trips of `allowed` moved up beside their frames (`hostOf`): such a node,
 * laid out in the layer right below its frame, joins the frame's layer, to stand beside the frame's last layer when
 * the blocks are put together, so both its lines run across rather than down and back up. It moves only where no
 * other edge of it ends in the frame's layer, so no edge turns around or runs within a layer that did not.
 */
export function roundTrips(
  layers: readonly (readonly string[])[],
  edges: readonly LayerEdge[],
  frames: ReadonlySet<string>,
  allowed: ReadonlySet<string>,
): RoundTrips {
  const rowOf = new Map(layers.flatMap((row, r) => row.map((k) => [k, r] as const)));
  const out = layers.map((row) => [...row]);
  const beside = new Map<string, string>();
  for (const v of layers.flat()) {
    const host = allowed.has(v) ? hostOf(v, edges, frames) : undefined;
    const at = host === undefined ? undefined : rowOf.get(host);
    if (host === undefined || at === undefined || rowOf.get(v) !== at + 1) continue;
    const others = edges.flatMap((e) => (e.from === v ? [e.to] : e.to === v ? [e.from] : []));
    if (others.some((u) => u !== host && rowOf.get(u) === at)) continue;
    out[at + 1] = (out[at + 1] ?? []).filter((k) => k !== v);
    out[at] = [...(out[at] ?? []), v];
    rowOf.set(v, at);
    beside.set(v, host);
  }
  return { layers: out, beside };
}
