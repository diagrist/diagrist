import { assignLayers } from '../layers/assign.js';
import { acyclic, type LayerEdge } from '../layers/graph.js';
import { blockedHandOver, handOvers, nodeLanes } from './hand-overs.js';
import type { LayeredEdge, LayeredSpec } from './spec.js';

/**
 * The layering of a picture: the layer of every node, placeholders where an edge crosses a layer, and per edge the
 * chain of nodes it runs through from its upper end to its lower end. `down` says whether the edge is drawn the
 * way the layers run, from its upper end; otherwise its points are turned around so the head stays at `to`.
 */
export interface Ranked {
  readonly layerOf: ReadonlyMap<string, number>;
  /** Placeholders, `d:<edge>:<i>`, each standing for one edge in one layer it crosses. */
  readonly dummies: ReadonlySet<string>;
  readonly chains: ReadonlyMap<string, readonly string[]>;
  readonly down: ReadonlyMap<string, boolean>;
  /** Edges between two nodes of one layer, drawn beside each other. */
  readonly beside: readonly LayeredEdge[];
  /** Edges that run up or past a layer on a rail beside the layers (`LayeredEdge.rail`), without placeholders. */
  readonly rails?: readonly LayeredEdge[];
}

/** The edge as the layering sees it: `rank` -1 turned into 1 with its ends swapped. */
const layerEdge = (e: LayeredEdge): LayerEdge =>
  e.rank === -1 ? { from: e.to, to: e.from, rank: 1 } : { from: e.from, to: e.to, rank: e.rank === 0 ? 0 : 1 };

/** Layers without gaps, counted from 0. */
function compact(layer: Map<string, number>): Map<string, number> {
  const used = [...new Set(layer.values())].sort((a, b) => a - b);
  return new Map([...layer].map(([n, l]) => [n, used.indexOf(l)]));
}

/**
 * A source with one edge down moves next to the node it points at, so the edge needs no placeholders, unless a
 * node beside it holds it in its layer. Repeated until nothing moves.
 */
function shorten(
  nodes: readonly string[],
  ranked: readonly LayerEdge[],
  held: ReadonlySet<string>,
  layer: Map<string, number>,
): void {
  for (let moved = true; moved; ) {
    moved = false;
    for (const n of nodes) {
      const out = ranked.filter((e) => e.from === n);
      const into = ranked.some((e) => e.to === n);
      const child = out.length === 1 ? out[0]?.to : undefined;
      if (into || child === undefined || held.has(n)) continue;
      const target = (layer.get(child) ?? 0) - 1;
      if (target > (layer.get(n) ?? 0)) {
        layer.set(n, target);
        moved = true;
      }
    }
  }
}

/**
 * The layer of every node: as `fixed` says, else along the edges, cycles cut and edges from lone sources short, the
 * ends of a hand-over between lanes in one layer (`handOvers`) unless its line would pass a box or a long line of a
 * lane between (`blockedHandOver`), and one that cannot join its ends one layer down.
 */
function layersOf(
  spec: LayeredSpec,
  edges: readonly LayeredEdge[],
  fixed?: ReadonlyMap<string, number>,
): Map<string, number> {
  if (fixed !== undefined) return compact(new Map(spec.nodes.map((n) => [n.id, fixed.get(n.id) ?? 0])));
  const banned = new Set<string>();
  for (;;) {
    const find = handOvers(spec, banned);
    const grouped = joinedLayers(spec, edges, find);
    if ((spec.lanes ?? []).length === 0) return grouped;
    const bad = blockedHandOver(spec, edges, find, grouped);
    if (bad === undefined) return new Map(spec.nodes.map((n) => [n.id, grouped.get(find(n.id)) ?? 0]));
    banned.add(bad);
  }
}

/** The layer of every group of nodes a hand-over joins (`find`), by its representative. */
function joinedLayers(
  spec: LayeredSpec,
  edges: readonly LayeredEdge[],
  find: (id: string) => string,
): Map<string, number> {
  const nodes = [...new Set(spec.nodes.map((n) => find(n.id)))];
  const lane = (spec.lanes ?? []).length > 0 ? nodeLanes(spec) : undefined;
  const across = (e: LayerEdge) => lane !== undefined && e.rank === 0 && lane.get(e.from) !== lane.get(e.to);
  const asLayers = edges
    .map(layerEdge)
    .map((e) => ({ ...e, from: find(e.from), to: find(e.to), ...(across(e) ? { rank: 1 as const } : {}) }))
    .filter((e) => e.from !== e.to);
  const ranked = acyclic(nodes, asLayers);
  const side = asLayers.filter((e) => e.rank === 0);
  const held = new Set(side.flatMap((e) => [e.from, e.to]));
  const layer = assignLayers(nodes, ranked, side);
  shorten(nodes, ranked, held, layer);
  return compact(layer);
}

/**
 * Layers every node, or takes the layers `fixed` gives, and threads placeholders through long edges; an edge
 * between two nodes of one layer is drawn beside, and an edge that may take a rail and runs up the layers or past
 * one takes one, unless `chained` names it.
 */
export function rank(spec: LayeredSpec, fixed?: ReadonlyMap<string, number>, chained?: ReadonlySet<string>): Ranked {
  const known = new Set(spec.nodes.map((n) => n.id));
  const edges = spec.edges.filter((e) => known.has(e.from) && known.has(e.to) && e.from !== e.to);
  const layerOf = layersOf(spec, edges, fixed);
  const all = new Map(layerOf);
  const dummies = new Set<string>();
  const chains = new Map<string, string[]>();
  const down = new Map<string, boolean>();
  const beside: LayeredEdge[] = [];
  const rails: LayeredEdge[] = [];
  for (const e of edges) {
    const a = layerOf.get(e.from) ?? 0;
    const b = layerOf.get(e.to) ?? 0;
    if (a === b) {
      beside.push(e);
      continue;
    }
    const railed = e.rail === 'up' ? a > b : e.rail === true && (a > b || b - a > 1);
    if (railed && chained?.has(e.id) !== true) {
      rails.push(e);
      continue;
    }
    const [upper, lower] = a < b ? [e.from, e.to] : [e.to, e.from];
    const top = Math.min(a, b);
    const chain = [upper];
    for (let l = top + 1; l < Math.max(a, b); l++) {
      const id = `d:${e.id}:${l - top}`;
      dummies.add(id);
      all.set(id, l);
      chain.push(id);
    }
    chain.push(lower);
    chains.set(e.id, chain);
    down.set(e.id, a < b);
  }
  return { layerOf: all, dummies, chains, down, beside, ...(rails.length > 0 ? { rails } : {}) };
}
