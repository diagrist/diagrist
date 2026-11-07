import { describe, expect, it } from 'vitest';
import { type LayerGraph, layerGraph } from '../src/index.js';

const ranked = (pairs: string): LayerGraph['edges'] =>
  pairs.split(' ').map((pair) => {
    const [from = '', to = ''] = pair.split('>');
    return { from, to, rank: 1 };
  });

/** A frame `F` of a chain and an edgeless node `h`, a node `p` entered from the frame that returns to `h`. */
const trip: LayerGraph = {
  nodes: ['a', 'f1', 'f2', 'h', 'p', 'z'],
  edges: ranked('a>f1 f1>f2 F>p p>h f2>z'),
  maxPerLayer: 8,
  frames: [{ id: 'F', members: ['f1', 'f2', 'h'] }],
};

const sorted = (graph: LayerGraph) => layerGraph(graph).layers.map((l) => [...l].sort());

describe('round trips of a frame', () => {
  it('stand below the frame unless the search puts them beside its last layer', () => {
    expect(sorted(trip)).toEqual([['a'], ['f1'], ['f2', 'h'], ['p', 'z']]);
    expect(sorted({ ...trip, trips: new Set(['p']) })).toEqual([['a'], ['f1'], ['f2', 'h', 'p'], ['z']]);
  });

  it('keep the node they return to at the bottom of the frame, beside its last layer', () => {
    const layers = sorted({ ...trip, trips: new Set(['p']) });
    expect(layers.findIndex((l) => l.includes('h'))).toBe(layers.findIndex((l) => l.includes('p')));
  });

  it('stay below where the node wants to stand beside another, or has another edge into the layer of the frame', () => {
    const beside = { ...trip, edges: [...trip.edges, { from: 'p', to: 'z', rank: 0 as const }], trips: new Set(['p']) };
    expect(sorted(beside).at(-1)).toContain('p');
    const across: LayerGraph = {
      ...trip,
      nodes: [...trip.nodes, 'g'],
      edges: [...trip.edges, ...ranked('a>g g>p')],
      trips: new Set(['p']),
    };
    expect(sorted(across).at(-1)).toContain('p');
  });
});
