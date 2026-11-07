import { describe, expect, it } from 'vitest';
import { type GraphEdge, type GraphNode, layoutGraph } from '../src/index.js';

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

/** Eight boxes under one, each with a line up into it on one whole trunk, five a layer: three pass a layer. */
const fan = () => {
  const kids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const nodes: GraphNode[] = [
    { id: 'z', width: 560, height: 188 },
    ...kids.map((id) => ({ id, width: 320, height: 130 })),
  ];
  const edges: GraphEdge[] = kids.map((k) => ({
    id: `${k}-z`,
    from: k,
    to: 'z',
    rank: 'up',
    weight: 2,
    bundle: 'z',
    trunk: 'whole',
  }));
  return { layout: layoutGraph({ nodes, edges, given: { perLayer: 5 }, metrics: METRICS }), kids };
};

describe('ends on the top and bottom of a box', () => {
  it('stand near the middle where their line comes from a placeholder, the line jogging in the gap instead', () => {
    const { layout, kids } = fan();
    const rect = (id: string) => layout.nodes.find((n) => n.id === id)?.rect;
    const offsets = kids.map((k) => {
      const r = rect(k);
      const start = layout.routes.find((x) => x.edge === `${k}-z`)?.points[0];
      return r && start ? Math.abs(start[0] - (r.x + r.w / 2)) / r.w : 1;
    });
    expect(new Set(kids.map((k) => rect(k)?.y)).size).toBe(2);
    expect(offsets.every((o) => o <= 0.25)).toBe(true);
  });
});
