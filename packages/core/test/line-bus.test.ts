import { describe, expect, it } from 'vitest';
import { lineMetrics, linesOfDrawing } from '../src/index.js';

const box = (id: string, x: number, y: number) => ({ id, rect: { x, y, w: 80, h: 40 } });

describe('lines on a bus', () => {
  /** Two boxes above each using two below, all four lines along one shared line at y 100. */
  const nodes = [box('a', 0, 0), box('b', 200, 0), box('c', 0, 200), box('d', 200, 200)];
  const on = (index: number, from: string, to: string, x1: number, x2: number) => ({
    index,
    from,
    to,
    domId: `edge-${index}`,
    points: [
      [x1, 40],
      [x1, 100],
      [x2, 100],
      [x2, 200],
    ] as [number, number][],
  });
  const edges = [
    on(0, 'a', 'c', 40, 40),
    on(1, 'a', 'd', 40, 240),
    on(2, 'b', 'c', 240, 40),
    on(3, 'b', 'd', 240, 240),
  ];
  const anchors = { width: 400, height: 300, nodes: nodes.map((n) => ({ ...n, domId: n.id })), groups: [] };

  it('read the lines of one bus as one bundle, so the shared line is no lines on one another', () => {
    const plain = linesOfDrawing({ anchors: { ...anchors, edges } });
    const bus = linesOfDrawing({ anchors: { ...anchors, edges: edges.map((e) => ({ ...e, bus: 'k' })) } });
    expect(lineMetrics(plain).overlaps).toBeGreaterThan(0);
    expect(lineMetrics(bus).overlaps).toBe(0);
    expect(bus.routes.every((r) => r.bundles?.includes('bus k'))).toBe(true);
  });
});
