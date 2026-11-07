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

  it('still counts a line to a bar as a branch: a decision that also goes to a fork is no parent of one child', () => {
    const decision = [
      { id: 'd', rect: rect(200, 0) },
      { id: 'x', rect: rect(100, 100) },
      { id: 'f', rect: rect(260, 100, 200, 6), outline: 'bar' as const },
    ];
    const fork = line('2', 'd', 'f', [280, 20], [300, 20], [300, 100]);
    const branches = [line('1', 'd', 'x', [200, 20], [140, 20], [140, 100]), fork];
    expect(lineMetrics({ nodes: decision, routes: branches }).childOffset).toBe(0);
    expect(lineMetrics({ nodes: decision, routes: branches.slice(0, 1) }).childOffset).toBe(100);
  });

  it('takes a box with a bar above it for no single child, and a box with a bar below it for no parent of many', () => {
    const merged = [
      { id: 'p', rect: rect(0, 0) },
      { id: 'j', rect: rect(200, 0, 200, 6), outline: 'bar' as const },
      { id: 'm', rect: rect(100, 100) },
    ];
    const joined = [
      line('1', 'p', 'm', [40, 40], [40, 60], [140, 60], [140, 100]),
      line('2', 'j', 'm', [300, 6], [300, 120], [180, 120]),
    ];
    expect(lineMetrics({ nodes: merged, routes: joined }).childOffset).toBe(0);
    const parent = [
      { id: 'p', rect: rect(100, 0) },
      { id: 'a', rect: rect(0, 300) },
      { id: 'b', rect: rect(300, 300) },
      { id: 'f', rect: rect(120, 300, 120, 6), outline: 'bar' as const },
    ];
    const fan = (to: string, x: number) => line(to, 'p', to, [140, 40], [140, 200], [x, 200], [x, 300]);
    const routes = [fan('a', 40), fan('b', 340), fan('f', 180)];
    expect(lineMetrics({ nodes: parent, routes }).parentsOff).toBe(0);
    expect(lineMetrics({ nodes: parent, routes: routes.slice(0, 2) }).parentsOff).toBe(1);
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
