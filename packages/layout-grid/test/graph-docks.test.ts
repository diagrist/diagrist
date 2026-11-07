import { describe, expect, it } from 'vitest';
import { type GraphContainer, type GraphEdge, type GraphNode, type LayoutGraph, layoutGraph } from '../src/index.js';

const METRICS = {
  colGap: 64,
  rowGapMin: 72,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 8,
  left: 48,
  top: 32,
};
const box = (id: string, width = 120): GraphNode => ({ id, width, height: 48 });
const point = (id: string, dock: string): GraphNode => ({ id, width: 16, height: 16, shape: 'ellipse', dock });
const rail = (from: string, to: string): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank: 'down',
  profile: 'rail',
});
const frame = (id: string, members: string[]): GraphContainer => ({
  id,
  kind: 'frame',
  members,
  pad: 24,
  top: 40,
  head: { width: 80, height: 20 },
});
const graph = (g: Omit<LayoutGraph, 'metrics'>): LayoutGraph => ({ ...g, metrics: METRICS });
const route = (l: ReturnType<typeof layoutGraph>, id: string) => l.routes.find((r) => r.edge === id)?.points ?? [];

describe('rails through docked nodes', () => {
  it('keep their lead from the docked node they run into, not from the outline it stands on', () => {
    const l = layoutGraph(
      graph({
        nodes: [box('s'), box('a'), box('b'), point('p', 'f'), point('q', 'f')],
        edges: [rail('s', 'p'), rail('s', 'q'), rail('p', 'a'), rail('q', 'b'), rail('a', 'b')],
        containers: [frame('f', ['a', 'b'])],
      }),
    );
    const line = route(l, 's-q');
    const [last, end] = [line.at(-2) ?? [0, 0], line.at(-1) ?? [0, 0]];
    expect(line.length).toBeGreaterThan(2);
    expect(Math.abs(end[0] - last[0]) + Math.abs(end[1] - last[1])).toBeGreaterThanOrEqual(METRICS.lead);
  });
});
