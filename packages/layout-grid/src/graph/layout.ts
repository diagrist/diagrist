import { layoutLayered } from '../layered/index.js';
import type { LayeredLayout } from '../layered/output.js';
import type { LayeredEdge, LayeredFrame, LayeredSpec } from '../layered/spec.js';
import type { LayerEdge, LayerGraph } from '../layers/graph.js';
import type { GraphContainer, GraphEdge, GraphRank, LayoutGraph } from './spec.js';

/** The rank of the layered stages for a rank of the graph; `free` stands beside where the edges decide the layers. */
const RANKS: Readonly<Record<GraphRank, LayeredEdge['rank']>> = { down: 1, up: -1, beside: 0, free: 0 };

/** An edge as the layering of `layerGraph` reads it: `up` turned around, `beside` of rank 0. */
function layerEdge(e: GraphEdge): LayerEdge {
  if (e.rank === 'up') return { from: e.to, to: e.from, rank: 1 };
  return { from: e.from, to: e.to, rank: e.rank === 'down' ? 1 : e.rank === 'free' ? 'free' : 0 };
}

/** A frame of the graph other than a core as a frame of the layered stages. */
const frameOf = (c: GraphContainer): LayeredFrame => ({
  id: c.id,
  members: c.members,
  ...(c.parent === undefined ? {} : { parent: c.parent }),
  pad: c.pad,
  top: c.top,
  head: { width: c.head.width, height: c.head.height },
  ...(c.tab === true ? { tab: true } : {}),
});

/** The graph a picture with `perLayer` is layered by: its nodes, its edges by rank, its frames, sizes by area. */
function layeringOf(graph: LayoutGraph, perLayer: number, frames: readonly LayeredFrame[]): LayerGraph {
  return {
    nodes: graph.nodes.map((n) => n.id),
    edges: graph.edges.map(layerEdge),
    maxPerLayer: perLayer,
    sizes: new Map(graph.nodes.map((n) => [n.id, n.width * n.height])),
    ...(frames.length > 0
      ? {
          frames: frames.map((f) => ({
            id: f.id,
            members: f.members,
            ...(f.parent === undefined ? {} : { parent: f.parent }),
          })),
        }
      : {}),
  };
}

/**
 * A layout graph as the spec of the layered stages: nodes and edges as they are, ranks of the stages, its frames,
 * the core of a hub, the given layers, and the graph of `layerGraph` where `perLayer` asks for it.
 */
export function specOf(graph: LayoutGraph): LayeredSpec {
  const given = graph.given ?? {};
  const containers = graph.containers ?? [];
  const core = given.arrangement === 'hub' ? containers.find((c) => c.kind === 'core') : undefined;
  const frames = containers.filter((c) => c.kind !== 'core').map(frameOf);
  const edges = graph.edges.map(({ rank, profile: _, ...e }): LayeredEdge => ({ ...e, rank: RANKS[rank] }));
  return {
    nodes: graph.nodes.map(({ sides: _, ...n }) => n),
    edges,
    metrics: graph.metrics,
    ...(core
      ? {
          hub: {
            core: core.members,
            head: { text: core.head.text ?? '', width: core.head.width, size: core.head.size ?? core.head.height },
            pad: core.pad,
          },
        }
      : {}),
    ...(given.ranks === undefined ? {} : { layers: given.ranks, ...(given.order === 'free' ? { reorder: true } : {}) }),
    ...(given.perLayer === undefined ? {} : { layering: layeringOf(graph, given.perLayer, frames) }),
    ...(frames.length > 0 ? { frames } : {}),
  };
}

/**
 * Lays out a layout graph (ADR 0039): layers, order, positions, ports, tracks, routes and texts, each stage on the
 * data the graph gives and priced by `scoreOf` where it searches. The same graph gives the same picture.
 */
export function layoutGraph(graph: LayoutGraph): LayeredLayout {
  return layoutLayered(specOf(graph));
}
