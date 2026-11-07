import type { Point } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { type GridSpec, placeGrid, type Route, routeEdges } from '../src/index.js';
import { edge, group, spec } from './fixture.js';

const routed = (s: GridSpec, priced = true) => {
  const layout = placeGrid(s);
  return { layout, routes: routeEdges({ ...s, channels: true }, layout, priced) };
};
const length = (r: Route | undefined) =>
  (r?.points ?? []).slice(1).reduce((n, q, i) => {
    const p = r?.points[i] as Point;
    return n + Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]);
  }, 0);
const lowest = (r: Route | undefined) => Math.max(...(r?.points ?? []).map((p: Point) => p[1]));
const rectOf = (layout: ReturnType<typeof placeGrid>, id: string) => {
  const rect = layout.nodes.find((n) => n.id === id)?.rect;
  if (!rect) throw new Error(`missing ${id}`);
  return rect;
};

describe('channel routes priced by the measure', () => {
  const nodes = ['t@b/r1', 'e@a/r2', 'm@b/r2', 'd@c/r2'];

  it('takes the lane below the last row where the gap above crosses a line hanging into the row', () => {
    const s = spec('a b c', 'r1 r2', nodes, { edges: [edge('t', 'm'), edge('e', 'd')] });
    const { layout, routes } = routed(s);
    const m = rectOf(layout, 'm');
    expect(lowest(routes[1])).toBeGreaterThan(m.y + m.h);
    expect(lowest(routed(s, false).routes[1])).toBeLessThanOrEqual(m.y);
  });

  it('keeps the edge in the gap where a frame holding both its boxes cannot grow round the lane', () => {
    const s = spec('a b c', 'r1 r2 r3', [...nodes, 'z@b/r3'], {
      groups: [group('f', ['e', 'm', 'd'])],
      edges: [edge('t', 'm'), edge('e', 'd')],
    });
    const { layout, routes } = routed(s);
    expect(lowest(routes[1])).toBeLessThan(rectOf(layout, 'z').y);
  });

  it('runs the edge outside a frame that holds one of its boxes only', () => {
    const s = spec('a b c', 'r1 r2', nodes, {
      groups: [group('f', ['e', 'm'])],
      edges: [edge('t', 'm'), edge('e', 'd')],
    });
    const { layout, routes } = routed(s);
    const frame = layout.groups.find((g) => g.id === 'f')?.rect;
    expect(lowest(routes[1])).toBeGreaterThan((frame?.y ?? 0) + (frame?.h ?? 0));
  });

  it('takes a shorter way for a line that crosses nothing, and tells the way its rounds kept', () => {
    const s = spec('a b c', 'r1 r2 r3', ['l@a/r1', 'v@b/r1', 's@a/r2', 'w@b/r2', 'f@b/r3', 'e@c/r2'], {
      edges: [
        ...[
          ['s', 'w'],
          ['w', 'f'],
          ['w', 'e'],
          ['w', 'v'],
        ].flatMap(([a = '', b = '']) => [edge(a, b), edge(b, a)]),
        edge('l', 'w'),
      ],
    });
    const plain = routed(s, false).routes[8];
    const priced = routed(s).routes[8];
    expect(length(priced)).toBeLessThan(length(plain) - 100);
    expect(priced?.way).toMatchObject({ shape: 'Z', lane: { axis: 'col', index: 0 } });
    expect(priced?.earlier).toEqual({});
  });
});
