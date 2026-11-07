import type { Point } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { type GraphEdge, type LayoutGraph, layoutGraph } from '../src/index.js';

const METRICS = {
  colGap: 40,
  rowGapMin: 64,
  track: 16,
  portGap: 16,
  lead: 16,
  tail: 16,
  labelGap: 10,
  left: 48,
  top: 72,
};
const box = (id: string) => ({ id, width: 120, height: 60 });
const edge = (from: string, to: string, rank: GraphEdge['rank']): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank,
});
const hang = (from: string, line: string, more: Partial<GraphEdge> = {}): GraphEdge => ({
  id: `${from}~${line}`,
  from,
  to: line,
  rank: 'down',
  hang: true,
  ...more,
});
const laid = (g: Omit<LayoutGraph, 'metrics'>) => {
  const l = layoutGraph({ ...g, given: { perLayer: 5 }, metrics: METRICS });
  const rect = (id: string) => l.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
  const route = (id: string) => l.routes.find((r) => r.edge === id)?.points ?? [];
  return { l, rect, route };
};

/** Whether `p` lies on one of the pieces of `line`. */
const onLine = (p: Point, line: readonly Point[]) =>
  line
    .slice(1)
    .some(
      (q, i) =>
        Math.min(q[0], (line[i] as Point)[0]) <= p[0] &&
        p[0] <= Math.max(q[0], (line[i] as Point)[0]) &&
        Math.min(q[1], (line[i] as Point)[1]) <= p[1] &&
        p[1] <= Math.max(q[1], (line[i] as Point)[1]),
    );

describe('boxes hanging from lines', () => {
  it('hang a box below a line between two boxes of one layer, by a straight line from its middle', () => {
    const { rect, route } = laid({
      nodes: [box('a'), box('b'), box('c')],
      edges: [edge('a', 'b', 'beside'), hang('c', 'a-b')],
    });
    const [a, b, c] = [rect('a'), rect('b'), rect('c')];
    expect(a.y).toBe(b.y);
    expect(c.y).toBeGreaterThan(a.y + a.h);
    const points = route('c~a-b');
    expect(points).toHaveLength(2);
    const [start, end] = points as [Point, Point];
    expect(start).toEqual([c.x + c.w / 2, c.y]);
    expect(onLine(end, route('a-b'))).toBe(true);
    expect(end[0]).toBeGreaterThan(a.x + a.w);
    expect(end[0]).toBeLessThan(b.x);
  });

  it('stand in the layer of the lower end of a line between two layers, not below it', () => {
    const { rect, route } = laid({
      nodes: [box('a'), box('b'), box('c')],
      edges: [edge('a', 'b', 'down'), hang('c', 'a-b')],
    });
    const [b, c] = [rect('b'), rect('c')];
    expect(c.y).toBe(b.y);
    const points = route('c~a-b');
    expect(points.length).toBeGreaterThan(1);
    expect(onLine(points.at(-1) as Point, route('a-b'))).toBe(true);
  });

  it('hang above their line where below their line would cross another, if the kind lets them', () => {
    const nodes = [box('s'), box('m'), box('p'), box('c')];
    const lines = [edge('s', 'm', 'beside'), edge('m', 'p', 'down'), edge('s', 'p', 'down')];
    const below = laid({ nodes, edges: [...lines, hang('c', 's-m')] });
    const either = laid({ nodes, edges: [...lines, hang('c', 's-m', { either: true })] });
    expect(below.rect('c').y).toBeGreaterThan(below.rect('s').y);
    const [c, s] = [either.rect('c'), either.rect('s')];
    expect(c.y + c.h).toBeLessThan(s.y);
    expect(either.route('c~s-m')).toHaveLength(2);
  });
});
