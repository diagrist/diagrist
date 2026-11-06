import { describe, expect, it } from 'vitest';
import type { GraphEdge, GraphNode } from '../src/index.js';
import { layWith } from './layered-picture.js';

const METRICS = {
  colGap: 16,
  rowGapMin: 56,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 6,
  left: 48,
  top: 32,
};
const box = (id: string, width = 120): GraphNode => ({ id, width, height: 44 });
const edge = (from: string, to: string): GraphEdge => ({ id: `${from}-${to}`, from, to, rank: 'down' });
const lay = layWith(METRICS);

describe('the sides of an opaque frame', () => {
  it('keep a line that neither starts nor ends in the frame outside, where the head would grow over it', () => {
    const l = lay({
      nodes: [box('s', 20), box('t'), box('a'), box('z', 20)],
      edges: [edge('s', 'z'), edge('t', 'a')],
      layers: [['s', 't'], ['a'], ['z']],
      reorder: true,
      frames: [{ id: 'f', members: ['a'], pad: 20, top: 40, head: { width: 80, height: 20 }, opaque: true }],
    });
    const f = l.frames?.find((g) => g.id === 'f')?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    const passing = l.routes.find((r) => r.edge === 's-z')?.points ?? [];
    expect(passing.length).toBeGreaterThan(0);
    for (const [x] of passing) expect(x).toBeLessThan(f.x);
  });
});
