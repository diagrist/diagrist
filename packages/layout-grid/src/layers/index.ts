import { assignLayers } from './assign.js';
import { fitLayers } from './fit.js';
import { acyclic, type Layered, type LayerGraph, neighbours } from './graph.js';
import { layerNested } from './nest.js';
import { orderLayers } from './order.js';
import { leavesOf, packLeaves } from './pack.js';
import { positions } from './positions.js';

function compact(layer: Map<string, number>): Map<string, number> {
  const used = [...new Set(layer.values())].sort((a, b) => a - b);
  return new Map([...layer].map(([n, l]) => [n, used.indexOf(l)]));
}

/** Too wide layers break into pieces of at most `max` places; the layers below move down. */
function wrap(layers: readonly string[][], max: number, places: (n: string) => number): string[][] {
  return layers.flatMap((layer) => {
    const chunks: string[][] = [];
    let used = max;
    for (const n of layer) {
      if (used + places(n) > max || chunks.length === 0) {
        chunks.push([]);
        used = 0;
      }
      chunks.at(-1)?.push(n);
      used += places(n);
    }
    return chunks.length ? chunks : [[]];
  });
}

/** How many places a node takes in its layer. */
const placesOf =
  (graph: LayerGraph) =>
  (n: string): number =>
    graph.widths?.get(n) ?? 1;

/** Connected parts in declaration order. */
function components(graph: LayerGraph): string[][] {
  const adj = neighbours(graph);
  const seen = new Set<string>();
  return graph.nodes.flatMap((start) => {
    if (seen.has(start)) return [];
    const part = [start];
    seen.add(start);
    for (let i = 0; i < part.length; i++)
      for (const m of adj.get(part[i] as string) ?? [])
        if (!seen.has(m)) {
          seen.add(m);
          part.push(m);
        }
    return [graph.nodes.filter((n) => part.includes(n))];
  });
}

/** Nodes of `last` one layer below the deepest other node, if there is one. */
function lowest(layer: Map<string, number>, last: readonly string[]): Map<string, number> {
  const inner = [...layer].filter(([n]) => !last.includes(n));
  if (!inner.length) return layer;
  const deepest = Math.max(0, ...inner.map(([, l]) => l));
  return new Map([...layer].map(([n, l]) => [n, last.includes(n) ? Math.max(l, deepest + 1) : l]));
}

function layersOf(graph: LayerGraph): Map<string, number> {
  const fixed = graph.fixed;
  if (fixed !== undefined) return new Map(graph.nodes.map((n) => [n, fixed.get(n) ?? 0]));
  const ranked = acyclic(graph.nodes, graph.edges);
  const side = graph.edges.filter((e) => e.rank !== 1 && e.from !== e.to);
  const assigned = lowest(assignLayers(graph.nodes, ranked, side), graph.last ?? []);
  const leaves = leavesOf(graph);
  const places = placesOf(graph);
  const fitted = fitLayers(graph.nodes, ranked, side, assigned, graph.maxPerLayer, (n) =>
    leaves.has(n) ? 0 : places(n),
  );
  return compact(packLeaves(graph, fitted, leaves));
}

function single(graph: LayerGraph): Layered {
  const layerOf = layersOf(graph);
  const adj = neighbours(graph);
  const layers = wrap(
    orderLayers(graph.nodes, layerOf, adj, graph.thorough === true),
    graph.maxPerLayer,
    placesOf(graph),
  );
  const wrapped = new Map(layers.flatMap((layer, l) => layer.map((n) => [n, l] as const)));
  return { layers, position: positions(layers, adj, wrapped) };
}

/**
 * Layers a graph: cycles broken by direction, layers by longest path with `last` at the bottom, order by barycentre,
 * columns near the mean of the neighbours, too wide layers wrapped. Separate parts stand side by side and wrap into
 * bands when together they grow too wide. With `frames`, each frame is laid out first as a block of layers
 * (`layerNested`). The same graph gives the same layers.
 */
export function layerGraph(graph: LayerGraph): Layered {
  if ((graph.frames ?? []).length > 0) return layerNested(graph, graph.frames ?? [], layerGraph);
  const places = placesOf(graph);
  const layers: string[][] = [];
  const position = new Map<string, number>();
  let x = 0;
  let top = 0;
  let height = 0;
  for (const nodes of components(graph)) {
    const edges = graph.edges.filter((e) => nodes.includes(e.from));
    const part = single({
      nodes,
      edges,
      maxPerLayer: graph.maxPerLayer,
      last: graph.last ?? [],
      ...(graph.thorough === true ? { thorough: true } : {}),
      ...(graph.fixed === undefined ? {} : { fixed: graph.fixed }),
      ...(graph.sizes === undefined ? {} : { sizes: graph.sizes }),
      ...(graph.widths === undefined ? {} : { widths: graph.widths }),
      ...(graph.moves === undefined ? {} : { moves: graph.moves }),
      ...(graph.blocks === undefined ? {} : { blocks: graph.blocks }),
    });
    const width =
      graph.widths === undefined
        ? Math.max(...part.position.values()) + 1
        : Math.max(...part.layers.map((layer) => layer.reduce((sum, n) => sum + places(n), 0)));
    if (x > 0 && x + width > graph.maxPerLayer) {
      top += height;
      x = 0;
      height = 0;
    }
    part.layers.forEach((layer, l) => {
      layers[top + l] = [...(layers[top + l] ?? []), ...layer];
    });
    for (const [n, p] of part.position) position.set(n, p + x);
    x += width;
    height = Math.max(height, part.layers.length);
  }
  return { layers, position };
}
