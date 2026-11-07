import { describe, expect, it } from 'vitest';
import { type GraphContainer, type GraphEdge, type LayoutGraph, layoutGraph } from '../src/index.js';

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
const PAD = 20;
const edge = (from: string, to: string, rank: GraphEdge['rank'] = 'down'): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank,
});
const lane = (id: string, members: string[]): GraphContainer => ({
  id,
  kind: 'lane',
  members,
  pad: PAD,
  top: 0,
  head: { width: 60, height: 20 },
});

/** A process that goes back and forth between three lanes, with a hand-over beside in one layer. */
const PROCESS: LayoutGraph = {
  nodes: ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, width: id === 'b' ? 200 : 120, height: 44 })),
  edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('d', 'e', 'beside'), edge('e', 'f'), edge('a', 'f')],
  containers: [lane('left', ['c', 'f']), lane('middle', ['a', 'd']), lane('right', ['b', 'e'])],
  metrics: METRICS,
};

describe('lanes of the layout graph', () => {
  const l = layoutGraph(PROCESS);
  const rect = (id: string) => l.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
  const column = (id: string) => l.lanes?.find((c) => c.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };

  it('stand side by side in the order given, each a column as high as the picture', () => {
    expect(l.lanes?.map((c) => c.id)).toEqual(['left', 'middle', 'right']);
    const [left, middle, right] = ['left', 'middle', 'right'].map(column);
    expect(left?.x).toBe(METRICS.left);
    expect((left?.x ?? 0) + (left?.w ?? 0)).toBeLessThanOrEqual(middle?.x ?? 0);
    expect((middle?.x ?? 0) + (middle?.w ?? 0)).toBeLessThanOrEqual(right?.x ?? 0);
    for (const c of [left, middle, right]) expect(c?.y).toBe(METRICS.top);
    expect(new Set([left, middle, right].map((c) => c?.h)).size).toBe(1);
    expect(l.width).toBeGreaterThanOrEqual((right?.x ?? 0) + (right?.w ?? 0));
  });

  it('hold their nodes in every layer, their pad from the edges, whatever order the lines would rather have', () => {
    for (const c of PROCESS.containers ?? [])
      for (const id of c.members) {
        const [r, col] = [rect(id), column(c.id)];
        expect(r.x).toBeGreaterThanOrEqual(col.x + PAD);
        expect(r.x + r.w).toBeLessThanOrEqual(col.x + col.w - PAD);
      }
  });

  it('let a hand-over beside run from side to side into the next lane', () => {
    const route = l.routes.find((r) => r.edge === 'd-e');
    expect(rect('d').y).toBe(rect('e').y);
    expect(route?.points.every((p) => p[1] === route.points[0]?.[1])).toBe(true);
  });
});

describe('a join over several lanes', () => {
  const box = (id: string, width = 120) => ({ id, width, height: 44 });
  const l = layoutGraph({
    nodes: [
      box('s'),
      { id: 'fork', width: 40, height: 6, shape: 'bar' },
      ...['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2'].map((id) => box(id)),
      { id: 'join', width: 40, height: 6, shape: 'bar' },
      box('z', 160),
    ],
    edges: [
      edge('s', 'fork'),
      ...['a', 'b', 'c', 'd'].flatMap((k) => [edge('fork', `${k}1`), edge(`${k}1`, `${k}2`), edge(`${k}2`, 'join')]),
      edge('join', 'z'),
    ],
    containers: [
      lane('left', ['s', 'fork', 'a1', 'a2', 'join']),
      lane('right', ['b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'z']),
    ],
    metrics: METRICS,
  });
  const centre = (id: string) => {
    const r = l.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    return r.x + r.w / 2;
  };

  it('hangs the one line out of it under the middle of the branches of its own lane, the bar having none', () => {
    const branches = ['b2', 'c2', 'd2'].map(centre);
    expect(centre('z')).toBe((Math.min(...branches) + Math.max(...branches)) / 2);
  });
});
