import { layoutLayered } from '../layered/index.js';
import type { LayeredLayout } from '../layered/output.js';
import type { LayeredEdge, LayeredFrame, LayeredSpec } from '../layered/spec.js';
import type { LayerEdge, LayerGraph } from '../layers/graph.js';
import type { CellGraph, CellLayout } from './cells.js';
import { eitherWay } from './either.js';
import { layoutCells } from './grid.js';
import type { GraphContainer, GraphEdge, GraphRank, LayoutGraph } from './spec.js';
import { staged } from './stages.js';
import { drawStraight, hideStraight } from './straight.js';

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
  head: { width: c.head.width, height: c.head.height, ...(c.head.air === undefined ? {} : { air: c.head.air }) },
  ...(c.tab === true ? { tab: true } : {}),
  ...(c.opaque === true ? { opaque: true } : {}),
});

/** The graph a picture with `perLayer` is layered by: its nodes, its edges by rank, its frames, sizes by area. */
function layeringOf(graph: LayoutGraph, perLayer: number, frames: readonly LayeredFrame[]): LayerGraph {
  return {
    nodes: graph.nodes.map((n) => n.id),
    edges: graph.edges.map(layerEdge),
    maxPerLayer: perLayer,
    ...(graph.given?.last === undefined ? {} : { last: graph.given.last }),
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
  const frames = containers.filter((c) => c.kind !== 'core' && c.kind !== 'lane').map(frameOf);
  const lanes = containers
    .filter((c) => c.kind === 'lane')
    .map((c) => ({ id: c.id, members: c.members, pad: c.pad, width: c.head.width, top: c.top }));
  const edges = graph.edges.map(
    ({ rank, profile, either: _, ...e }): LayeredEdge => ({
      ...e,
      rank: RANKS[rank],
      ...(profile === 'rail' ? { rail: true } : profile === 'back' ? { rail: 'up' as const } : {}),
    }),
  );
  return {
    nodes: graph.nodes.map(({ dock: _, ...n }) => n),
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
    ...(lanes.length > 0 ? { lanes } : {}),
  };
}

/**
 * Lays out a layout graph (ADR 0039): layers, order, positions, ports, tracks, routes and texts, each stage on the
 * data the graph gives and priced by `scoreOf` where it searches, straight lines drawn once the boxes stand
 * (`drawStraight`), targets of `either` edges on the side that crosses least (`eitherWay`); a graph with the author's cells (`given.cells`) in its grid, through the channel stage. The same
 * graph gives the same picture.
 */
export function layoutGraph(graph: CellGraph): CellLayout;
export function layoutGraph(graph: LayoutGraph): LayeredLayout;
export function layoutGraph(graph: LayoutGraph): LayeredLayout | CellLayout {
  if (graph.given?.cells) return layoutCells(graph as CellGraph);
  const chosen = eitherWay(graph, (g) => staged(hideStraight(g), layoutLayered, specOf), specOf);
  return drawStraight(chosen.graph, chosen.layout);
}
