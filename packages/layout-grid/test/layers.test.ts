import { describe, expect, it } from 'vitest';
import { type LayerGraph, layerGraph } from '../src/index.js';

const ranked = (pairs: string): LayerGraph['edges'] =>
  pairs.split(' ').map((pair) => {
    const [from = '', to = ''] = pair.split('>');
    return { from, to, rank: 1 };
  });

describe('layering a graph', () => {
  it('puts each node one layer below its deepest predecessor and lines up side edges in one layer', () => {
    const graph: LayerGraph = {
      nodes: ['a', 'b', 'c', 'd'],
      edges: [...ranked('a>b b>c'), { from: 'c', to: 'd', rank: 0 }],
      maxPerLayer: 5,
    };
    expect(layerGraph(graph).layers).toEqual([['a'], ['b'], ['c', 'd']]);
  });

  it('breaks a cycle by turning the edge that closes it, in declaration order', () => {
    const graph: LayerGraph = { nodes: ['a', 'b', 'c'], edges: ranked('a>b b>c c>a'), maxPerLayer: 5 };
    expect(layerGraph(graph).layers).toEqual([['a'], ['b'], ['c']]);
  });

  it('places a parent between its children and wraps a too wide layer', () => {
    const tree = layerGraph({ nodes: ['p', 'x', 'y'], edges: ranked('p>x p>y'), maxPerLayer: 5 });
    expect(tree.position.get('p')).toBe(((tree.position.get('x') ?? 0) + (tree.position.get('y') ?? 0)) / 2);
    const wide = layerGraph({ nodes: ['p', 'a', 'b', 'c'], edges: ranked('p>a p>b p>c'), maxPerLayer: 2 });
    expect(wide.layers.map((l) => l.length)).toEqual([1, 2, 1]);
  });

  it('gives the same layers whatever order equal costs come in', () => {
    const graph: LayerGraph = {
      nodes: ['a', 'b', 'c', 'd', 'e'],
      edges: ranked('a>c b>c a>d b>e e>a'),
      maxPerLayer: 3,
    };
    expect(layerGraph(graph)).toEqual(layerGraph(structuredClone(graph)));
  });
});
