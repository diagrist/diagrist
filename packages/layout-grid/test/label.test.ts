import { checkPlacement } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import {
  cheapest,
  type EdgeText,
  fitFrames,
  type GridSpec,
  labelEdges,
  occupancy,
  placedOf,
  placeGrid,
  routeEdges,
} from '../src/index.js';
import { edge, group, overlap, spec } from './fixture.js';

function laidOut(s: GridSpec, texts: readonly EdgeText[]) {
  const layout = placeGrid(s);
  const routes = routeEdges(s, layout);
  return { layout, routes, labels: labelEdges(s, layout, routes, texts) };
}

describe('edge labels', () => {
  it('put the name above a horizontal line and the detail below it', () => {
    const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], { edges: [edge('x', 'y')] });
    const { routes, labels } = laidOut(s, [{ edge: 'x-y', name: 'reads', detail: 'HTTPS' }]);
    const y = routes[0]?.points[0]?.[1] ?? 0;
    expect(labels.map((l) => [l.text, l.part, l.anchor])).toEqual([
      ['reads', 'name', 'middle'],
      ['HTTPS', 'detail', 'middle'],
    ]);
    expect(labels[0]?.y).toBeLessThan(y);
    expect(labels[1]?.y).toBeGreaterThan(y);
  });

  it('stand beside a vertical line, right of it when accented, and wrap long texts into two lines', () => {
    const s = spec('a', 'r1 r2', ['x@a/r1', 'y@a/r2'], { edges: [edge('x', 'y')] });
    const { routes, labels } = laidOut(s, [{ edge: 'x-y', name: 'sends events', detail: 'Kafka', accent: true }]);
    const x = routes[0]?.points[0]?.[0] ?? 0;
    expect(labels.map((l) => l.text)).toEqual(['sends events', 'Kafka']);
    for (const l of labels) expect(l.box.x).toBeGreaterThan(x);
  });

  it('do not overlap each other, nodes or frame heads in an adaptive grid', () => {
    const s = spec('a b c', 'r1 r2 r3', ['x@a/r1', 'y@c/r1', 'z@b/r3', 'w@c/r3'], {
      adaptive: true,
      groups: [group('g', ['z', 'w'])],
      edges: [edge('x', 'y'), edge('x', 'z'), edge('y', 'w'), edge('z', 'w')],
    });
    const texts = s.edges.map((e) => ({ edge: e.id, name: `name of ${e.id}`, detail: 'protocol' }));
    const { layout, labels } = laidOut(s, texts);
    labels.forEach((a, i) => {
      for (const b of labels.slice(i + 1)) expect(overlap(a.box, b.box)).toBe(false);
      for (const n of layout.nodes) expect(overlap(a.box, n.rect)).toBe(false);
    });
  });

  it('seat an end box on the end of the line and its mark beside it', () => {
    const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], { edges: [edge('x', 'y')] });
    const { routes, labels } = laidOut(s, [{ edge: 'x-y', from: { box: 'U', mark: 'S' } }]);
    const [box, mark] = labels;
    const start = routes[0]?.points[0];
    if (!box || !mark || !start) throw new Error('missing');
    expect([box.part, mark.part]).toEqual(['box', 'mark']);
    expect(box.frame?.rect.x).toBe(start[0] + 1);
    expect(overlap(box.box, mark.box)).toBe(false);
  });
});

describe('what the grid placed', () => {
  it('passes the kernel placement check for a clean picture, frames grown around their routes', () => {
    const s = spec('a b', 'r1 r2', ['x@a/r1', 'y@b/r2'], {
      adaptive: true,
      groups: [group('g', ['x', 'y'], { source: { line: 4, column: 1, length: 5 } })],
      edges: [edge('x', 'y')],
    });
    const { layout, routes, labels } = laidOut(s, [{ edge: 'x-y', name: 'calls' }]);
    const fitted = fitFrames(s, layout, routes, labels);
    const placed = placedOf(s, fitted, routes, labels);
    expect(placed.map((p) => [p.key, p.kind, p.within])).toEqual([
      ['g', 'box', undefined],
      ['x', 'box', 'g'],
      ['y', 'box', 'g'],
      ['x-y.label.1', 'text', 'g'],
    ]);
    expect(placed[0]?.span?.line).toBe(4);
    const picture = { width: fitted.width, height: fitted.bottom };
    expect(checkPlacement(placed, picture)).toEqual([]);
  });
  it('hands over ellipses and circles with their outline', () => {
    const s = spec('a b', 'r', [
      { id: 'pay', col: 'a', row: 'r', width: 160, height: 64, shape: 'ellipse' },
      { id: 'user', col: 'b', row: 'r', width: 40, shape: 'circle' },
    ]);
    expect(placedOf(s, placeGrid(s)).map((p) => [p.key, p.outline, p.rect.w, p.rect.h])).toEqual([
      ['pay', 'ellipse', 160, 64],
      ['user', 'ellipse', 40, 40],
    ]);
  });
});

describe('occupancy', () => {
  it('weighs a free box at 0 and picks the cheapest candidate, the first on a tie', () => {
    const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], { lines: 'straight', edges: [edge('x', 'y')] });
    const layout = placeGrid(s);
    const routes = routeEdges(s, layout);
    const room = occupancy(s, layout, routes);
    const x = layout.nodes[0]?.rect;
    if (!x) throw new Error('missing');
    const onNode = { ...x, w: 20, h: 10 };
    const free = { x: x.x, y: x.y - 100, w: 20, h: 10 };
    expect(room.cost(free)).toBe(0);
    expect(room.cost(onNode)).toBeGreaterThan(0);
    expect(cheapest([onNode, free, { ...free, x: free.x + 30 }], (b) => b, room)).toBe(free);
    room.take(free);
    expect(room.cost(free)).toBeGreaterThan(0);
  });
});
