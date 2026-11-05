import { describe, expect, it } from 'vitest';
import {
  type Anchors,
  avoidableBends,
  type LineNode,
  type LineRoute,
  lineMetrics,
  linesOfDrawing,
  type Placed,
  type Point,
  type Rect,
} from '../src/index.js';

const rect = (x: number, y: number, w = 80, h = 40): Rect => ({ x, y, w, h });
const box = (id: string, x: number, y: number): LineNode => ({ id, rect: rect(x, y) });
const line = (edge: string, from: string, to: string, ...points: Point[]): LineRoute => ({ edge, from, to, points });

describe('line metrics', () => {
  it('count crossings, bends and weighted length, and measure how boxes stand over their neighbours below', () => {
    const nodes = [box('p', 120, 0), box('c1', 0, 200), box('c2', 200, 200), box('q', 400, 0), box('k', 410, 200)];
    const routes = [
      line('1', 'p', 'c1', [160, 40], [160, 120], [40, 120], [40, 200]),
      line('2', 'p', 'c2', [160, 40], [160, 120], [240, 120], [240, 200]),
      { ...line('3', 'q', 'k', [450, 40], [450, 200]), weight: 2 },
      line('4', 'u', 'v', [0, 100], [300, 100]),
    ];
    expect(lineMetrics({ nodes, routes })).toEqual({
      lines: 4,
      crossings: 2,
      bends: 4,
      maxBends: 2,
      length: 1140,
      parentsOff: 1,
      parentOffset: 20,
      childrenOff: 1,
      childOffset: 10,
      width: 490,
      height: 240,
    });
  });

  it('find a box centred over its children and a single child right under its parent', () => {
    const nodes = [box('p', 100, 0), box('c1', 0, 200), box('c2', 200, 200), box('q', 400, 0), box('k', 400, 200)];
    const routes = [
      line('1', 'p', 'c1', [140, 40], [140, 120], [40, 120], [40, 200]),
      line('2', 'p', 'c2', [140, 40], [140, 120], [240, 120], [240, 200]),
      line('3', 'q', 'k', [440, 40], [440, 200]),
    ];
    const m = lineMetrics({ nodes, routes, width: 600, height: 300 });
    expect([m.parentsOff, m.childrenOff, m.width, m.height]).toEqual([0, 0, 600, 300]);
  });
});

describe('lines of a drawing', () => {
  const anchors: Anchors = {
    width: 400,
    height: 300,
    nodes: [
      { id: 'a', domId: 'node-a', rect: rect(20, 60) },
      { id: 'b', domId: 'node-b', rect: rect(0, 200) },
      { id: 'c', domId: 'node-c', rect: rect(200, 200) },
    ],
    groups: [{ id: 'f', domId: 'group-f', rect: rect(10, 30, 120, 90) }],
    edges: [
      {
        index: 0,
        from: 'a',
        to: 'b',
        domId: 'edge-0',
        points: [
          [60, 100],
          [60, 150],
          [40, 150],
          [40, 200],
        ],
      },
      {
        index: 1,
        from: 'a',
        to: 'c',
        domId: 'edge-1',
        points: [
          [60, 100],
          [60, 150],
          [240, 150],
          [240, 200],
        ],
      },
    ],
  };
  const placed: Placed[] = [
    { key: 'f', kind: 'box', rect: rect(10, 30, 120, 90) },
    { key: 'a', kind: 'box', rect: rect(20, 60), within: 'f' },
    { key: 'a.pin.1', kind: 'box', rect: rect(56, 96, 8, 8), within: 'f' },
    { key: 'b', kind: 'box', rect: rect(0, 200), outline: 'ellipse' },
    { key: 'f.name', kind: 'text', rect: rect(20, 34, 40, 12) },
    { key: 'rel-0.label.1', kind: 'text', rect: rect(44, 160, 30, 12) },
    { key: 'label-1', kind: 'text', rect: rect(150, 134, 30, 12) },
    { key: '0.number', kind: 'text', rect: rect(64, 104, 12, 12) },
    { key: 'head-0', kind: 'text', rect: rect(300, 10, 40, 12) },
  ];
  const input = linesOfDrawing({ anchors, placed });

  it('take boxes from the anchors with their outlines, and parts of a box as owned by it', () => {
    expect(input.nodes).toEqual([
      { id: 'a', rect: rect(20, 60) },
      { id: 'b', rect: rect(0, 200), outline: 'ellipse' },
      { id: 'c', rect: rect(200, 200) },
      { id: 'a.pin.1', rect: rect(56, 96, 8, 8), owner: 'a' },
    ]);
  });

  it('read a box holding others as a frame, with the text named after it as its head', () => {
    expect(input.frames).toEqual([{ id: 'f', rect: rect(10, 30, 120, 90), head: rect(20, 34, 40, 12) }]);
  });

  it('tie texts to the line whose index their key names, and other texts to their owner', () => {
    expect(input.labels).toEqual([
      { key: 'rel-0.label.1', edge: '0', box: rect(44, 160, 30, 12) },
      { key: 'label-1', edge: '1', box: rect(150, 134, 30, 12) },
    ]);
    expect(input.texts).toEqual([
      { key: '0.number', rect: rect(64, 104, 12, 12), owner: '0' },
      { key: 'head-0', rect: rect(300, 10, 40, 12) },
    ]);
  });

  it('read lines leaving a box at one point as a bundle', () => {
    expect(input.routes.map((r) => [r.edge, r.from, r.to, r.bundles])).toEqual([
      ['0', 'a', 'b', ['at 60.0,100.0']],
      ['1', 'a', 'c', ['at 60.0,100.0']],
    ]);
    expect([input.width, input.height]).toEqual([400, 300]);
  });

  it('read a fan drawn against its reading, from its far ends to the shared point, as a bundle', () => {
    const reversed = anchors.edges.map((e) => ({ ...e, points: [...e.points].reverse() }));
    const read = linesOfDrawing({ anchors: { ...anchors, edges: reversed }, placed });
    expect(read.routes.map((r) => r.bundles)).toEqual([['at 60.0,100.0'], ['at 60.0,100.0']]);
  });
});

describe('avoidable bends', () => {
  it('count a bent line whose boxes share a stretch for a straight one, unless a box stands in the way', () => {
    const nodes = [box('a', 0, 0), box('b', 30, 200)];
    const bent = line('1', 'a', 'b', [40, 40], [40, 120], [70, 120], [70, 200]);
    expect(avoidableBends({ nodes, routes: [bent] })).toBe(1);
    expect(avoidableBends({ nodes, routes: [line('2', 'a', 'b', [60, 40], [60, 200])] })).toBe(0);
    const wall = { id: 'w', rect: rect(0, 100, 200, 20) };
    expect(avoidableBends({ nodes: [...nodes, wall], routes: [bent] })).toBe(0);
    expect(avoidableBends({ nodes: [box('a', 0, 0), box('c', 300, 200)], routes: [{ ...bent, to: 'c' }] })).toBe(0);
  });
});
