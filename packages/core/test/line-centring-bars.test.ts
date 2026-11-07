import { describe, expect, it } from 'vitest';
import { type Anchors, type LineRoute, lineMetrics, linesOfDrawing, type Point, type Rect } from '../src/index.js';

const rect = (x: number, y: number, w = 80, h = 40): Rect => ({ x, y, w, h });
const line = (edge: string, from: string, to: string, ...points: Point[]): LineRoute => ({ edge, from, to, points });

describe('the centring of lines at a bar', () => {
  const nodes = [
    { id: 'a', rect: rect(0, 0) },
    { id: 'b', rect: rect(400, 0) },
    { id: 'j', rect: rect(20, 100, 440, 6), outline: 'bar' as const },
    { id: 'n', rect: rect(380, 200) },
  ];
  const routes = [
    line('1', 'a', 'j', [40, 40], [40, 100]),
    line('2', 'b', 'j', [440, 40], [440, 100]),
    line('3', 'j', 'n', [420, 106], [420, 200]),
  ];

  it('leaves out the lines into and out of a bar, which has no middle a box could stand off', () => {
    const m = lineMetrics({ nodes, routes });
    expect([m.parentsOff, m.childrenOff, m.childOffset]).toEqual([0, 0, 0]);
    const box = lineMetrics({ nodes: nodes.map((n) => ({ id: n.id, rect: n.rect })), routes });
    expect(box.childrenOff).toBe(1);
  });

  it('reads the outline of a bar from what the layout placed', () => {
    const anchors: Anchors = {
      width: 500,
      height: 300,
      nodes: [{ id: 'j', domId: 'n-j', rect: rect(20, 100, 440, 6) }],
      edges: [],
      groups: [],
    };
    const placed = [{ key: 'j', kind: 'box' as const, rect: rect(20, 100, 440, 6), outline: 'bar' as const }];
    expect(linesOfDrawing({ anchors, placed }).nodes).toEqual([
      { id: 'j', rect: rect(20, 100, 440, 6), outline: 'bar' },
    ]);
  });
});
