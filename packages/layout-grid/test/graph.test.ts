import { describe, expect, it } from 'vitest';
import { type GraphEdge, type GraphNode, type LayoutGraph, layoutGraph } from '../src/index.js';

const METRICS = {
  colGap: 56,
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
const edge = (from: string, to: string, rank: GraphEdge['rank'] = 'down'): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank,
});
const graph = (g: Omit<LayoutGraph, 'metrics'>): LayoutGraph => ({ ...g, metrics: METRICS });
const rectOf = (l: ReturnType<typeof layoutGraph>, id: string) =>
  l.nodes.find((n) => n.id === id)?.rect ?? l.frames?.find((f) => f.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };

describe('the layout graph', () => {
  it('ranks its edges: down below, up above, beside in one layer, the head at `to` whichever way', () => {
    const l = layoutGraph(
      graph({
        nodes: [box('a'), box('b'), box('c'), box('d')],
        edges: [edge('a', 'b'), edge('a', 'c', 'up'), edge('a', 'd', 'beside')],
      }),
    );
    const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => rectOf(l, id));
    expect(b?.y).toBeGreaterThan(a?.y ?? 0);
    expect(c?.y).toBeLessThan(a?.y ?? 0);
    expect(d?.y).toBe(a?.y);
    const up = l.routes.find((r) => r.edge === 'a-c')?.points ?? [];
    expect(up.at(-1)?.[1]).toBe((c?.y ?? 0) + (c?.h ?? 0));
  });

  it('with `perLayer` packs leaves of free edges and holds a frame as a block of layers', () => {
    const leaves = ['l1', 'l2', 'l3', 'l4'];
    const l = layoutGraph(
      graph({
        nodes: [box('hub'), ...leaves.map((id) => box(id, 80)), box('f1'), box('f2')],
        edges: [...leaves.map((id) => edge('hub', id, 'free')), edge('hub', 'f1'), edge('f1', 'f2')],
        containers: [
          { id: 'f', kind: 'frame', members: ['f1', 'f2'], pad: 20, top: 40, head: { width: 60, height: 20 } },
        ],
        given: { perLayer: 3 },
      }),
    );
    const rows = new Set(['hub', ...leaves].map((id) => l.nodes.find((n) => n.id === id)?.row));
    expect(rows.size).toBeGreaterThan(1);
    const [hub, f, f1, f2] = ['hub', 'f', 'f1', 'f2'].map((id) => rectOf(l, id));
    expect(f?.y).toBeGreaterThan((hub?.y ?? 0) + (hub?.h ?? 0));
    for (const r of [f1, f2])
      expect((r?.y ?? 0) > (f?.y ?? 0) && (r?.y ?? 0) + (r?.h ?? 0) < (f?.y ?? 0) + (f?.h ?? 0)).toBe(true);
  });
});
