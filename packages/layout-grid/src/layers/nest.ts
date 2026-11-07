import { seatEdgeless } from './edgeless.js';
import type { LayerEdge, Layered, LayerFrame, LayerGraph } from './graph.js';
import { leavesOf } from './pack.js';
import { hostOf, roundTrips } from './round-trips.js';

/** A frame or the whole graph laid out: its nodes by layer, counted from its top, and its widest layer in places. */
interface Block {
  readonly layers: readonly (readonly string[])[];
  readonly width: number;
}

/** What the layering of one level needs: the graph without its frames, and how to lay out one level. */
interface Nesting {
  readonly graph: LayerGraph;
  readonly frames: readonly LayerFrame[];
  readonly flat: (graph: LayerGraph) => Layered;
  /** Collects the frames that are leaves of `free` edges in their level. */
  readonly leaves: string[];
  /** Collects the nodes that round-trip a frame of their level (`hostOf`). */
  readonly trips: string[];
}

/** The frames around a node or frame, innermost first, starting with itself; unknown frames and cycles end it. */
function chainsOf(frames: readonly LayerFrame[]): (id: string) => readonly string[] {
  const parent = new Map(frames.map((f) => [f.id, f.parent]));
  const home = new Map(frames.flatMap((f) => f.members.map((n) => [n, f.id] as const)));
  return (id) => {
    const chain = [id];
    for (let f = home.get(id) ?? parent.get(id); f !== undefined && parent.has(f) && !chain.includes(f); ) {
      chain.push(f);
      f = parent.get(f);
    }
    return chain;
  };
}

/**
 * The layers of one level, `owner` being a frame or undefined for the top: its nodes and its child frames, each frame
 * first as a block of its own, in the order of their first node. Edges are lifted to the children of the level, so
 * frames linked by their nodes stand above each other like nodes; a lifted edge against a ranked edge stated between
 * two children of the level gives way. The blocks of one layer stand at its top, and the layer is as high as its
 * highest block. `last` holds in every frame's block, and a node of a block with edges only out of its frame stands
 * at the side of the block where its partners are (`seatEdgeless`). A node that round-trips a frame of the level
 * stands beside the frame's last layer (`roundTrips`).
 */
function blockOf(n: Nesting, chain: (id: string) => readonly string[], owner: string | undefined): Block {
  const { graph, frames } = n;
  const lift = (id: string): string | undefined => {
    const c = chain(id);
    if (owner === undefined) return c.at(-1);
    const i = c.indexOf(owner);
    return i > 0 ? c[i - 1] : undefined;
  };
  const first = new Map<string, number>();
  graph.nodes.forEach((id, i) => {
    for (const f of chain(id)) if (!first.has(f)) first.set(f, i);
  });
  const kids = [...first.keys()]
    .filter((k) => chain(k)[1] === owner)
    .sort((a, b) => (first.get(a) ?? 0) - (first.get(b) ?? 0));
  const framed = new Set(frames.map((f) => f.id));
  const inner = new Map(kids.flatMap((k) => (framed.has(k) ? [[k, blockOf(n, chain, k)] as const] : [])));
  const stated = graph.edges.filter((e) => e.rank === 1 && kids.includes(e.from) && kids.includes(e.to));
  const lifted = graph.edges.flatMap((e): (LayerEdge & { readonly own: LayerEdge })[] => {
    const [from, to] = [lift(e.from), lift(e.to)];
    if (from === undefined || to === undefined || from === to || !kids.includes(from) || !kids.includes(to)) return [];
    return [{ ...e, from, to, own: e }];
  });
  const edges = lifted.flatMap(({ own: e, ...l }): LayerEdge[] =>
    e.rank === 1 && (l.from !== e.from || l.to !== e.to) && stated.some((s) => s.from === l.to && s.to === l.from)
      ? []
      : [l],
  );
  const size = (k: string) => (inner.has(k) ? Number.MAX_SAFE_INTEGER : (graph.sizes?.get(k) ?? 0));
  const places = (k: string) => inner.get(k)?.width ?? 1;
  const graphOf: LayerGraph = {
    nodes: kids,
    edges,
    maxPerLayer: graph.maxPerLayer,
    ...(graph.last === undefined || owner === undefined ? {} : { last: graph.last.filter((id) => kids.includes(id)) }),
    sizes: new Map(kids.map((k) => [k, size(k)])),
    widths: new Map(kids.map((k) => [k, places(k)])),
    blocks: new Set(inner.keys()),
    ...(graph.thorough === true ? { thorough: true } : {}),
    ...(graph.moves === undefined ? {} : { moves: graph.moves }),
  };
  for (const leaf of leavesOf(graphOf).keys()) if (inner.has(leaf)) n.leaves.push(leaf);
  const blocks = new Set(inner.keys());
  for (const k of kids) if (hostOf(k, lifted, blocks) !== undefined) n.trips.push(k);
  const level = roundTrips(n.flat(graphOf).layers, lifted, blocks, graph.trips ?? new Set());
  const rowOf = new Map(level.layers.flatMap((row, r) => row.map((k) => [k, r] as const)));
  const seating = { edges: graph.edges, chain, lift, rowOf, frames: framed, beside: level.beside };
  const layers: string[][] = [];
  let width = 0;
  for (const row of level.layers) {
    const top = layers.length;
    width = Math.max(
      width,
      row.reduce((sum, k) => sum + places(k), 0),
    );
    const seated = new Map(
      row.flatMap((k) => {
        const block = inner.get(k);
        return block === undefined ? [] : [[k, seatEdgeless(block.layers, k, seating)] as const];
      }),
    );
    for (const k of row) {
      const depth = seated.get(level.beside.get(k) ?? '')?.length ?? 1;
      const own = seated.get(k) ?? [...Array.from({ length: depth - 1 }, () => []), [k]];
      own.forEach((ids, l) => {
        layers[top + l] = [...(layers[top + l] ?? []), ...ids];
      });
    }
    if (layers.length === top) layers.push([]);
  }
  return { layers, width };
}

/**
 * The layers of a graph with frames: every frame's nodes in a block of layers of their own, each frame placed in its
 * parent's level like one node as wide as its widest layer, which keeps a picture of many frames as compact as one
 * of as many nodes. Without frames around them, nodes are laid out as by `flat`. The order within each layer is that
 * of the levels, for the caller to order anew.
 */
export function layerNested(graph: LayerGraph, frames: readonly LayerFrame[], flat: Nesting['flat']): Layered {
  const { layers } = blockOf({ graph, frames, flat, leaves: [], trips: [] }, chainsOf(frames), undefined);
  const kept = layers.filter((layer) => layer.length > 0);
  const position = new Map(kept.flatMap((layer) => layer.map((id, i) => [id, i] as const)));
  return { layers: kept, position };
}

/**
 * The choices of where frames and their partners stand: the frames that are leaves of `free` edges in the level they
 * stand in, whose one edge, lifted, is `free`, so they may stand beside their partner, above it or below it
 * (`LayerGraph.moves`), and the nodes that round-trip a frame of their level, which may stand beside its last layer
 * (`LayerGraph.trips`).
 */
export function framedChoices(graph: LayerGraph): { leaves: string[]; trips: string[] } {
  const choices = { leaves: [] as string[], trips: [] as string[] };
  blockOf(
    { graph, frames: graph.frames ?? [], flat: () => ({ layers: [], position: new Map() }), ...choices },
    chainsOf(graph.frames ?? []),
    undefined,
  );
  return choices;
}
