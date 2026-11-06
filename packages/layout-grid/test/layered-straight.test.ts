import { describe, expect, it } from 'vitest';
import { type LayeredEdge, type LayeredNode, layoutLayered } from '../src/index.js';

const METRICS = {
  colGap: 56,
  rowGapMin: 56,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 6,
  left: 32,
  top: 32,
};
const box = (id: string, width = 160): LayeredNode => ({ id, width, height: 44 });
const edge = (from: string, to: string): LayeredEdge => ({ id: `${from}-${to}`, from, to, rank: 1 });
const lay = (nodes: LayeredNode[], edges: LayeredEdge[]) => layoutLayered({ nodes, edges, metrics: METRICS });

describe('straight lines by moving what stands in their way', () => {
  it('moves the placeholders of a long line under its port, though the line would bend by more than a slip', () => {
    const nodes = ['v', 's', 'o', 'd', 'z', 'w', 'q'].map((id) => box(id));
    const edges = [edge('v', 's'), edge('s', 'z'), edge('v', 'd'), edge('v', 'o'), edge('w', 'q'), edge('q', 'd')];
    const l = lay(nodes, edges);
    const points = l.routes.find((r) => r.edge === 'v-d')?.points ?? [];
    expect(points).toHaveLength(2);
  });
});
