import { assignLayers } from './assign.js';
import { acyclic, type Layered, type LayerGraph, neighbours } from './graph.js';
import { orderLayers } from './order.js';
import { positions } from './positions.js';

function compact(layer: Map<string, number>): Map<string, number> {
  const used = [...new Set(layer.values())].sort((a, b) => a - b);
  return new Map([...layer].map(([n, l]) => [n, used.indexOf(l)]));
}

/** Too wide layers break into pieces; the layers below move down. */
function wrap(layers: readonly string[][], max: number): string[][] {
  return layers.flatMap((layer) => {
    const chunks: string[][] = [];
    for (let i = 0; i < layer.length; i += max) chunks.push(layer.slice(i, i + max));
    return chunks.length ? chunks : [[]];
  });
}

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

function single(graph: LayerGraph): Layered {
  const ranked = acyclic(graph.nodes, graph.edges);
  const side = graph.edges.filter((e) => e.rank === 0 && e.from !== e.to);
  const layerOf = compact(lowest(assignLayers(graph.nodes, ranked, side), graph.last ?? []));
  const adj = neighbours(graph);
  const layers = wrap(orderLayers(graph.nodes, layerOf, adj, graph.thorough === true), graph.maxPerLayer);
  const wrapped = new Map(layers.flatMap((layer, l) => layer.map((n) => [n, l] as const)));
  return { layers, position: positions(layers, adj, wrapped) };
}

/**
 * Layers a graph: cycles broken by direction, layers by longest path with `last` at the bottom, order by barycentre,
 * columns near the mean of the neighbours, too wide layers wrapped. Separate parts stand side by side and wrap into bands when together they
 * grow too wide. The same graph gives the same layers.
 */
export function layerGraph(graph: LayerGraph): Layered {
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
    });
    const width = Math.max(...part.position.values()) + 1;
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
