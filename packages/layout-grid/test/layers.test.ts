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

  it('packs the leaves of free edges around their node: the two smallest beside it, then above, then below', () => {
    const leaves = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'];
    const graph: LayerGraph = {
      nodes: ['hub', ...leaves],
      edges: leaves.map((l) => ({ from: 'hub', to: l, rank: 'free' as const })),
      maxPerLayer: 5,
      sizes: new Map(leaves.map((l, i) => [l, 60 - 10 * i])),
    };
    const layers = layerGraph(graph).layers.map((l) => [...l].sort());
    expect(layers).toEqual([
      ['l3', 'l4'],
      ['hub', 'l5', 'l6'],
      ['l1', 'l2'],
    ]);
  });

  it('keeps a family together where a full layer would cut off its last member: the parent moves down with it', () => {
    const graph: LayerGraph = {
      nodes: ['p', 'q', 'a', 'b', 'c', 'x', 'y', 'z'],
      edges: [...ranked('p>a p>b p>c q>x q>y q>z'), { from: 'p', to: 'q', rank: 'free' }],
      maxPerLayer: 5,
    };
    const layers = layerGraph(graph).layers.map((l) => [...l].sort());
    expect(layers).toEqual([['q'], ['p', 'x', 'y', 'z'], ['a', 'b', 'c']]);
  });

  it('gives the same layers whatever order equal costs come in', () => {
    const graph: LayerGraph = {
      nodes: ['a', 'b', 'c', 'd', 'e'],
      edges: ranked('a>c b>c a>d b>e e>a'),
      maxPerLayer: 3,
    };
    expect(layerGraph(graph)).toEqual(layerGraph(structuredClone(graph)));
  });

  it('searches thoroughly for an order without crossings, where two layers have to change together', () => {
    const edges = ranked('m>s m>f b>n s>x a>x a>y n>y f>z u>z');
    const nodes = ['a', 'u', 'x', 'y', 'z', 's', 'n', 'f', 'b', 'm'];
    const crossings = (layers: readonly (readonly string[])[]) => {
      const at = new Map(layers.flatMap((layer) => layer.map((n, i) => [n, i] as const)));
      const pairs = edges.map((e) => [at.get(e.from) ?? 0, at.get(e.to) ?? 0] as const);
      const level = new Map(layers.flatMap((layer, l) => layer.map((n) => [n, l] as const)));
      return edges.filter((e, i) =>
        edges.some(
          (o, j) =>
            j > i &&
            level.get(e.from) === level.get(o.from) &&
            ((pairs[i]?.[0] ?? 0) - (pairs[j]?.[0] ?? 0)) * ((pairs[i]?.[1] ?? 0) - (pairs[j]?.[1] ?? 0)) < 0,
        ),
      ).length;
    };
    expect(crossings(layerGraph({ nodes, edges, maxPerLayer: 5 }).layers)).toBeGreaterThan(0);
    expect(crossings(layerGraph({ nodes, edges, maxPerLayer: 5, thorough: true }).layers)).toBe(0);
  });
});
