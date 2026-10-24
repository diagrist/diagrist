import type { Point, Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { type GridSpec, placeGrid, type Route, routeEdges } from '../src/index.js';
import { edge, group, spec } from './fixture.js';

const routed = (s: GridSpec) => {
  const layout = placeGrid(s);
  return { layout, routes: routeEdges(s, layout) };
};

/** Does any segment of the route run through the inside of the rectangle? */
const crosses = (route: Route, r: Rect): boolean =>
  route.points.slice(1).some((q, i) => {
    const p = route.points[i] as Point;
    return (
      Math.min(p[0], q[0]) < r.x + r.w &&
      Math.max(p[0], q[0]) > r.x &&
      Math.min(p[1], q[1]) < r.y + r.h &&
      Math.max(p[1], q[1]) > r.y
    );
  });

describe('routing a fixed grid', () => {
  it('runs straight within a row, as an L between offset nodes, and as a loop to the node itself', () => {
    const s = spec('a b', 'r1 r2', ['x@a/r1', 'y@b/r1', 'z@b/r2'], {
      edges: [edge('x', 'y'), edge('x', 'z'), edge('z', 'z')],
    });
    const { routes } = routed(s);
    expect(routes.map((r) => [r.edge, r.shape, r.fromSide, r.toSide])).toEqual([
      ['x-y', 'straight', 'right', 'left'],
      ['x-z', 'L', 'bottom', 'left'],
      ['z-z', 'loop', 'right', 'bottom'],
    ]);
    expect(routes[0]?.points).toEqual([
      [240, 156],
      [376, 156],
    ]);
  });

  it('goes as a Z through the gap when a node stands in the way, and gives each Z its own lane', () => {
    const s = spec('a b c', 'r1 r2', ['x@a/r1', 'm@b/r1', 'y@c/r1', 'u@a/r2', 'v@c/r2'], {
      edges: [edge('x', 'y'), edge('u', 'v', { id: 'second' })],
    });
    const { layout, routes } = routed(s);
    const [first] = routes;
    const m = layout.nodes.find((n) => n.id === 'm')?.rect;
    if (!first || !m) throw new Error('missing');
    expect(first.shape).toBe('Z');
    expect(crosses(first, m)).toBe(false);
  });

  it('spreads several ends on one side of a node instead of stacking them', () => {
    const s = spec('a b', 'r1 r2 r3', ['hub@a/r2', 'p@b/r1', 'q@b/r3'], {
      edges: [edge('hub', 'p'), edge('hub', 'q')],
    });
    const starts = routed(s).routes.map((r) => r.points[0]);
    expect(new Set(starts.map((p) => JSON.stringify(p))).size).toBe(2);
  });

  it('reaches a frame as an end and skips edges to unknown ends', () => {
    const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], {
      groups: [group('g', ['y'])],
      edges: [edge('x', 'g'), edge('x', 'nowhere')],
    });
    const { layout, routes } = routed(s);
    const frame = layout.groups[0]?.rect;
    expect(routes.map((r) => r.edge)).toEqual(['x-g']);
    expect(routes[0]?.points.at(-1)?.[0]).toBe(frame?.x);
  });
});

describe('routing an adaptive grid', () => {
  const blocked = spec('a b c', 'r1 r2 r3', ['s@a/r1', 'w1@b/r1', 'w2@b/r2', 'w3@a/r2', 't@c/r3'], {
    adaptive: true,
    edges: [edge('s', 't')],
  });

  it('finds an orthogonal way around every node in between', () => {
    const { layout, routes } = routed(blocked);
    const [route] = routes;
    if (!route) throw new Error('missing');
    expect(route.unroutable).toBeUndefined();
    route.points.slice(1).forEach((q, i) => {
      const p = route.points[i] as Point;
      expect(p[0] === q[0] || p[1] === q[1]).toBe(true);
    });
    for (const n of layout.nodes.filter((n) => n.id.startsWith('w'))) expect(crosses(route, n.rect)).toBe(false);
  });

  it('routes the same way twice', () => {
    expect(routed(blocked).routes).toEqual(routed(structuredClone(blocked)).routes);
  });

  it('ends lines on the outline of ellipses and circles', () => {
    const s = spec(
      'a b',
      'r',
      [
        { id: 'e', col: 'a', row: 'r', shape: 'ellipse' },
        { id: 'c', col: 'b', row: 'r', shape: 'circle', width: 48 },
      ],
      {
        adaptive: true,
        edges: [edge('e', 'c')],
      },
    );
    const { layout, routes } = routed(s);
    const [e, c] = layout.nodes;
    const [start, end] = routes[0]?.points ?? [];
    if (!e || !c || !start || !end) throw new Error('missing');
    expect(start[0]).toBe(e.rect.x + e.rect.w);
    expect(c.rect.w).toBe(48);
    expect(Math.hypot(end[0] - (c.rect.x + 24), end[1] - (c.rect.y + 24))).toBeCloseTo(24, 6);
  });
});

describe('straight lines', () => {
  it('run from outline to outline on the line between the centres', () => {
    const s = spec('a b', 'r1 r2', [{ id: 'e', col: 'a', row: 'r1', shape: 'ellipse' }, 'b@b/r2'], {
      lines: 'straight',
      adaptive: true,
      metrics: { ...spec('a', 'r', []).metrics, endGap: 4 },
      edges: [edge('e', 'b')],
    });
    const { layout, routes } = routed(s);
    const [e, b] = layout.nodes;
    const [p, q] = routes[0]?.points ?? [];
    if (!e || !b || !p || !q) throw new Error('missing');
    const rx = e.rect.w / 2;
    const ry = e.rect.h / 2;
    expect(((p[0] - e.rect.x - rx) / rx) ** 2 + ((p[1] - e.rect.y - ry) / ry) ** 2).toBeCloseTo(1, 2);
    expect(b.rect.y - q[1]).toBeGreaterThan(0);
    expect(b.rect.y - q[1]).toBeLessThanOrEqual(4);
  });
});
