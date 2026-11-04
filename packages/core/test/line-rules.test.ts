import { describe, expect, it } from 'vitest';
import { type LineInput, type LineNode, type LineRoute, lineFindings, type Point } from '../src/index.js';

const box = (id: string, x: number, y: number, w = 80, h = 40): LineNode => ({ id, rect: { x, y, w, h } });
const line = (edge: string, from: string, to: string, ...points: Point[]): LineRoute => ({ edge, from, to, points });
const rules = (input: LineInput) => lineFindings(input).map((f) => f.rule);

/** Two boxes far apart, one above the other, and a straight line between them. */
const pair = [box('a', 0, 0), box('b', 0, 400)];

describe('line findings', () => {
  it('report two lines that cross, once, where they cross (Q1)', () => {
    const routes = [line('1', 'a', 'b', [40, 40], [40, 400]), line('2', 'c', 'd', [0, 200], [100, 200])];
    expect(lineFindings({ nodes: pair, routes })).toEqual([{ rule: 'crossing', edges: ['1', '2'], at: [40, 200] }]);
  });

  it('let lines of one bundle meet, and lines that only touch at an end', () => {
    const bundled = [
      { ...line('1', 'a', 'b', [40, 40], [40, 400]), bundles: ['in b'] },
      { ...line('2', 'c', 'b', [0, 200], [100, 200]), bundles: ['in b'] },
    ];
    expect(rules({ nodes: pair, routes: bundled })).toEqual([]);
    const touching = [line('1', 'a', 'b', [40, 40], [40, 400]), line('2', 'c', 'd', [40, 200], [140, 200])];
    expect(rules({ nodes: pair, routes: touching })).toEqual([]);
  });

  it('report crossings only up to a number of lines, which a picture drawn larger may raise', () => {
    const routes = [line('1', 'a', 'b', [40, 40], [40, 400]), line('2', 'c', 'd', [0, 200], [100, 200])];
    expect(rules({ nodes: pair, routes })).toEqual(['crossing']);
    expect(lineFindings({ nodes: pair, routes }, { crossingsUpTo: 1 })).toEqual([]);
  });

  it('report a line through a box, a text or the head of a frame that is not its own (Q2)', () => {
    const input: LineInput = {
      nodes: [...pair, box('c', 30, 100, 20, 20)],
      routes: [line('1', 'a', 'b', [40, 40], [40, 400])],
      texts: [{ key: 'note', rect: { x: 36, y: 200, w: 30, h: 12 } }],
      frames: [{ id: 'f', rect: { x: 0, y: 280, w: 200, h: 200 }, head: { x: 20, y: 284, w: 60, h: 14 } }],
    };
    expect(lineFindings(input).map((f) => [f.rule, f.other])).toEqual([
      ['through', 'c'],
      ['through', 'f'],
      ['through', 'note'],
    ]);
  });

  it('let a line pass a foreign box with room, and touch its own ends, their parts and its own texts', () => {
    const input: LineInput = {
      nodes: [...pair, box('c', 50, 100, 20, 20), { ...box('b.pin', 36, 396, 8, 8), owner: 'b' }],
      routes: [line('1', 'a', 'b', [40, 40], [40, 400])],
      labels: [{ key: '1.label', edge: '1', box: { x: 34, y: 200, w: 40, h: 12 } }],
    };
    expect(rules(input)).toEqual([]);
  });

  it('report a line running back through its own end (Q2, own)', () => {
    const back: Point[] = [
      [40, 40],
      [40, 60],
      [-20, 60],
      [-20, 20],
      [60, 20],
      [60, 400],
    ];
    expect(
      lineFindings({ nodes: pair, routes: [line('1', 'a', 'b', ...back)] }).filter((f) => f.rule === 'through'),
    ).toEqual([{ rule: 'through', edges: ['1'], at: [20, 20], other: 'a', detail: 'own' }]);
  });

  it('report more than two bends, unless the ends are far apart (Q3)', () => {
    const near = [box('a', 0, 0), box('b', 200, 100)];
    const steps: Point[] = [
      [40, 40],
      [40, 64],
      [100, 64],
      [100, 80],
      [240, 80],
      [240, 100],
    ];
    expect(rules({ nodes: near, routes: [line('1', 'a', 'b', ...steps)] })).toContain('bends');
    const found = lineFindings({ nodes: near, routes: [line('1', 'a', 'b', ...steps)] }).find(
      (f) => f.rule === 'bends',
    );
    expect(found).toMatchObject({ value: 4, limit: 2 });
    const far = [box('a', 0, 0), box('b', 200, 400)];
    const long: Point[] = [
      [40, 40],
      [40, 100],
      [100, 100],
      [100, 200],
      [240, 200],
      [240, 400],
    ];
    expect(rules({ nodes: far, routes: [line('1', 'a', 'b', ...long)] })).toEqual([]);
  });

  it('report a short run into the head (Q4) and out of the start (Q5)', () => {
    const routes = [line('1', 'a', 'b', [40, 40], [40, 50], [140, 50], [140, 60])];
    const nodes = [box('a', 0, 0), box('b', 100, 60)];
    expect(lineFindings({ nodes, routes }).map((f) => [f.rule, f.value])).toEqual([
      ['lead', 10],
      ['tail', 10],
    ]);
  });

  it('report a tiny inner segment and a small offset of a Z, and pass a Z with room (Q6)', () => {
    const nodes = [box('a', 0, 0), box('b', 0, 400)];
    const z = (dx: number) => [line('1', 'a', 'b', [40, 40], [40, 200], [40 + dx, 200], [40 + dx, 400])];
    expect(lineFindings({ nodes, routes: z(10) }).map((f) => [f.rule, f.value])).toEqual([['jog', 10]]);
    expect(lineFindings({ nodes, routes: z(20) }).map((f) => [f.rule, f.value])).toEqual([['jog', 20]]);
    expect(rules({ nodes, routes: z(40) })).toEqual([]);
  });

  it('report foreign parallel segments closer than the least distance where they overlap (Q7)', () => {
    const at = (x: number) => [line('1', 'a', 'b', [40, 40], [40, 400]), line('2', 'c', 'd', [x, 100], [x, 300])];
    expect(lineFindings({ nodes: pair, routes: at(46) })).toEqual([
      { rule: 'parallel', edges: ['1', '2'], at: [40, 200], value: 6 },
    ]);
    expect(rules({ nodes: pair, routes: at(52) })).toEqual([]);
  });

  it('report ports on one side too close or out of the order of their other ends (Q8)', () => {
    const nodes = [box('a', 100, 0, 200, 40), box('l', 0, 300), box('r', 300, 300)];
    const from = (x1: number, x2: number, to1: string, to2: string) => [
      line('1', 'a', to1, [x1, 40], [x1, 300]),
      line('2', 'a', to2, [x2, 40], [x2, 300]),
    ];
    const ports = (routes: LineRoute[]) =>
      lineFindings({ nodes, routes })
        .filter((f) => f.rule === 'ports')
        .map((f) => [f.other, f.detail]);
    expect(ports(from(180, 190, 'l', 'r'))).toEqual([['a', 'spacing']]);
    const apart = [
      line('1', 'a', 'l', [150, 40], [150, 200], [40, 200], [40, 300]),
      line('2', 'a', 'r', [250, 40], [250, 240], [340, 240], [340, 300]),
    ];
    expect(ports(apart)).toEqual([]);
    const crossed = [
      line('1', 'a', 'r', [150, 40], [150, 120], [340, 120], [340, 300]),
      line('2', 'a', 'l', [250, 40], [250, 160], [40, 160], [40, 300]),
    ];
    expect(ports(crossed)).toEqual([['a', 'order']]);
  });

  it('let nested rails around one side pass Q8, though their ends stand in opposite orders', () => {
    const nodes = [box('a', 0, 0, 80, 80), box('b', 0, 300, 80, 80)];
    const rails = [
      line('1', 'a', 'b', [80, 50], [120, 50], [120, 330], [80, 330]),
      line('2', 'a', 'b', [80, 20], [160, 20], [160, 360], [80, 360]),
    ];
    expect(lineFindings({ nodes, routes: rails }).filter((f) => f.rule === 'ports')).toEqual([]);
  });

  it('report a text far from its own line, near a foreign one, or on a box (Q9)', () => {
    const routes = [line('1', 'a', 'b', [40, 40], [40, 400]), line('2', 'c', 'd', [72, 100], [72, 300])];
    const label = (x: number, y = 200) => ({ key: '1.label', edge: '1', box: { x, y, w: 20, h: 12 } });
    const found = (x: number, y?: number) =>
      lineFindings({ nodes: pair, routes, labels: [label(x, y)] }).map((f) => [f.rule, f.detail, f.edges]);
    expect(found(-40)).toEqual([['label', 'far', ['1']]]);
    expect(found(44)).toEqual([['label', 'near', ['1', '2']]]);
    expect(found(24, 30)).toEqual([['label', 'overlap', ['1']]]);
    expect(found(14)).toEqual([]);
  });

  it('read the wrapped lines of one text as one block beside its line', () => {
    const routes = [line('1', 'a', 'b', [40, 40], [40, 400])];
    const labels = [
      { key: '1.label.1', edge: '1', box: { x: 44, y: 200, w: 30, h: 12 } },
      { key: '1.label.2', edge: '1', box: { x: 44, y: 212, w: 90, h: 12 } },
    ];
    expect(rules({ nodes: pair, routes, labels })).toEqual([]);
  });

  it('are sorted by rule, edges and place, so the same picture gives the same list', () => {
    const routes = [
      line('2', 'c', 'd', [0, 300], [100, 300]),
      line('1', 'a', 'b', [40, 40], [40, 400]),
      line('3', 'e', 'f', [0, 100], [100, 100]),
    ];
    const found = lineFindings({ nodes: pair, routes });
    expect(found.map((f) => [f.rule, ...f.edges])).toEqual([
      ['crossing', '1', '2'],
      ['crossing', '1', '3'],
    ]);
    expect(lineFindings({ nodes: pair, routes: [...routes].reverse() })).toEqual(found);
  });
});
