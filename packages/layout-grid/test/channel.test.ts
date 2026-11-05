import type { Point } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { type GridSpec, placeGrid, type Route, routeEdges } from '../src/index.js';
import { edge, group, spec } from './fixture.js';

const routed = (s: GridSpec) => {
  const layout = placeGrid(s);
  return { layout, routes: routeEdges(s, layout) };
};
const channels = (s: GridSpec): GridSpec => ({ ...s, channels: true });
const ends = (r: Route | undefined): readonly [Point, Point] => [
  (r?.points[0] ?? [0, 0]) as Point,
  (r?.points.at(-1) ?? [0, 0]) as Point,
];

describe('the channel stage of a fixed grid', () => {
  it('gives two edges between the same boxes ports of their own, twice the port spread apart', () => {
    const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], { edges: [edge('x', 'y'), edge('y', 'x')] });
    const [there, back] = routed(channels(s)).routes;
    expect(there?.shape).toBe('straight');
    expect(back?.shape).toBe('straight');
    expect(Math.abs(ends(there)[0][1] - ends(back)[1][1])).toBe(32);
    expect(ends(there)[0][1]).toBe(ends(there)[1][1]);
  });

  it('keeps ends on one side a port spread apart beside a reserved stretch', () => {
    const named = { id: 'hub', col: 'a', row: 'r3', reserve: { top: { from: 14, to: 120 } } } as const;
    const s = spec('a b', 'r1 r2 r3', ['p@b/r1', 'q@b/r2', named], { edges: [edge('hub', 'p'), edge('hub', 'q')] });
    const { layout, routes } = routed(channels(s));
    const hub = layout.nodes.find((n) => n.id === 'hub')?.rect;
    if (!hub) throw new Error('missing');
    const xs = routes.flatMap((r) => r.points.filter((p) => p[1] === hub.y).map((p) => p[0]));
    expect(xs).toHaveLength(2);
    expect(Math.abs((xs[0] ?? 0) - (xs[1] ?? 0))).toBeGreaterThanOrEqual(16);
    for (const x of xs) expect(x).toBeGreaterThanOrEqual(hub.x + 120 + 16);
  });

  it('lays the middle pieces of Zs through one gap on tracks of their own', () => {
    const s = spec('a b c', 'r1 r2', ['x@a/r1', 'm@b/r1', 'y@c/r1', 'u@a/r2', 'n@b/r2', 'v@c/r2'], {
      edges: [edge('x', 'v'), edge('u', 'y')],
    });
    const { routes } = routed(channels(s));
    const middles = routes.map((r) => (r.shape === 'Z' ? r.points[1] : undefined));
    expect(routes.map((r) => r.shape)).toEqual(['Z', 'Z']);
    const [first, second] = middles;
    if (!first || !second) throw new Error('missing');
    expect(first[0] === second[0] ? Math.abs(first[1] - second[1]) : Math.abs(first[0] - second[0])).toBe(16);
  });

  it('runs an edge to a frame beside it straight at the height of its node', () => {
    const s = spec('a b', 'r1 r2 r3', ['p@a/r1', 'q@a/r2', 'x@b/r2'], {
      groups: [group('f', ['p', 'q'])],
      edges: [edge('x', 'f')],
    });
    const { layout, routes } = routed(channels(s));
    const x = layout.nodes.find((n) => n.id === 'x')?.rect;
    const [start, end] = ends(routes[0]);
    expect(routes[0]?.shape).toBe('straight');
    expect(start[1]).toBe(end[1]);
    expect(start[1]).toBe((x?.y ?? 0) + (x?.h ?? 0) / 2);
  });

  it('keeps a line beside the icon circle in the middle of a top side', () => {
    const crest = { top: { from: -22, to: 22, origin: 'middle' } } as const;
    const s = spec('a', 'r1 r2', ['x@a/r1', { id: 'y', col: 'a', row: 'r2', reserve: crest }], {
      edges: [edge('x', 'y')],
    });
    const { layout, routes } = routed(channels(s));
    const y = layout.nodes.find((n) => n.id === 'y')?.rect;
    const end = ends(routes[0])[1];
    if (!y) throw new Error('missing');
    expect(end[1]).toBe(y.y);
    expect(Math.abs(end[0] - (y.x + y.w / 2))).toBeGreaterThanOrEqual(22 + 16);
  });

  it('runs through the strip of a frame beside the head its kind draws there', () => {
    const s = spec('a b', 'r1 r2', ['x@a/r1', 'y@a/r2'], {
      groups: [group('f', ['y'], { head: { x: 12, y: 8, w: 40, h: 28 } })],
      edges: [edge('x', 'y')],
    });
    expect(routed(channels(s)).routes[0]?.shape).toBe('straight');
    expect(routed(s).routes[0]?.shape).toBe('Z');
  });

  it('starts a line below the caption of the node it leaves downwards', () => {
    const figure = { id: 'x', col: 'a', row: 'r1', caption: { w: 60, below: 30 } } as const;
    const s = spec('a', 'r1 r2', [figure, 'y@a/r2'], { edges: [edge('x', 'y')] });
    const { layout, routes } = routed(channels(s));
    const x = layout.nodes.find((n) => n.id === 'x')?.rect;
    expect(ends(routes[0])[0][1]).toBe((x?.y ?? 0) + (x?.h ?? 0) + 30);
  });
});
