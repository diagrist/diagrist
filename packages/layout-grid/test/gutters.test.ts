import type { Point, Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import {
  type EdgeText,
  type GridSpec,
  gutterRoom,
  placeGrid,
  type Route,
  routeEdges,
  signEdges,
  widen,
} from '../src/index.js';
import { edge, spec } from './fixture.js';

const signed = (s: GridSpec, texts: readonly EdgeText[]) => {
  const layout = placeGrid(s);
  const routes = routeEdges(s, layout);
  return { layout, routes, ...signEdges(s, layout, routes, texts, [], {}) };
};
const WORDS: EdgeText = {
  edge: 'e0',
  name: 'Kontosalden und Positionen aller Kunden',
  detail: 'täglich 01:00 · 2 Mio. Sätze',
};
const LONG: EdgeText = {
  ...WORDS,
  name: 'Kontosalden-und-Positionen-aller-Kunden',
  detail: 'täglich-01:00-2-Mio.-Sätze',
};
const segments = (r: Route) => r.points.slice(1).map((q, i) => [r.points[i] as Point, q] as const);
const through = (r: Route, box: Rect) =>
  segments(r).some(([p, q]) => {
    const [x1, x2] = [Math.min(p[0], q[0]), Math.max(p[0], q[0])];
    const [y1, y2] = [Math.min(p[1], q[1]), Math.max(p[1], q[1])];
    return x2 > box.x && x1 < box.x + box.w && y2 > box.y && y1 < box.y + box.h;
  });

describe('gaps of a channel grid that grow for their texts (ADR 0038, D2)', () => {
  it('asks a narrow gap to grow until a long text beside the tracks of two Zs finds a clear spot', () => {
    const s: GridSpec = {
      ...spec('a b', 'r1 r2 r3', ['k@a/r2', 'h@a/r1', 'c@a/r3', 's@b/r2'], {
        edges: [edge('k', 's', { id: 'e0' }), edge('h', 's', { id: 'e1' }), edge('c', 's', { id: 'e2' })],
      }),
      channels: true,
    };
    const first = signed(s, [LONG]);
    expect(first.crowded).toEqual([0]);
    const room = gutterRoom(s, first.layout, first.routes, [LONG], first.crowded);
    const gap = (room.cols[0] ?? 0) - s.metrics.colGap;
    expect(gap).toBeGreaterThan(0);
    expect(room.rows).toEqual([0, 0]);
    const second = signed(widen(s, room), [LONG]);
    expect(second.crowded).toEqual([]);
    const k = second.layout.cols[1];
    expect(k?.x).toBe((first.layout.cols[1]?.x ?? 0) + gap);
  });

  it('wraps a long text into lines of two or three words beside the tracks instead of widening the gap', () => {
    const s: GridSpec = {
      ...spec('a b', 'r1 r2 r3', ['k@a/r2', 'h@a/r1', 'c@a/r3', 's@b/r2'], {
        edges: [edge('k', 's', { id: 'e0' }), edge('h', 's', { id: 'e1' }), edge('c', 's', { id: 'e2' })],
      }),
      channels: true,
    };
    const { crowded, labels } = signed(s, [WORDS]);
    expect(crowded).toEqual([]);
    expect(labels.map((l) => l.text)).toEqual([
      'Kontosalden und',
      'Positionen aller Kunden',
      'täglich 01:00',
      '2 Mio. Sätze',
    ]);
    for (const l of labels) expect(l.box.w).toBeLessThanOrEqual(16 * s.metrics.labelFont.size);
  });

  it('asks nothing when every text found its spot, so the grid keeps its measures', () => {
    const s: GridSpec = { ...spec('a b', 'r', ['x@a/r', 'y@b/r'], { edges: [edge('x', 'y')] }), channels: true };
    const short: EdgeText = { edge: 'x->y', name: 'liest' };
    const { layout, routes, crowded } = signed(s, [short]);
    expect(crowded).toEqual([]);
    const room = gutterRoom(s, layout, routes, [short], crowded);
    expect(room).toEqual({ cols: [0], rows: [] });
    expect(placeGrid(widen(s, room))).toEqual(layout);
  });

  it('bends a Z three times where every gap it may take runs through a box', () => {
    const s: GridSpec = {
      ...spec('a b c', 'r1 r2 r3', ['x@a/r3', 'w@a/r2', 'l@b/r3', 'm@b/r1', 'd@c/r2', 'y@c/r1'], {
        edges: [edge('x', 'y')],
      }),
      channels: true,
    };
    const layout = placeGrid(s);
    const [route] = routeEdges(s, layout);
    if (!route) throw new Error('missing');
    const others = layout.nodes.filter((n) => n.id !== 'x' && n.id !== 'y');
    expect(others.filter((n) => through(route, n.rect)).map((n) => n.id)).toEqual([]);
    expect(route.points).toHaveLength(5);
  });

  it('moves a Z that crowds a side to the gap on the other side of its boxes', () => {
    const s: GridSpec = {
      ...spec('a b c', 'r1 r2 r3 r4', ['hub@b/r2', 'mid@b/r3', 'low@b/r4', 'n1@c/r1', 'n2@c/r2', 'n3@c/r3'], {
        edges: [edge('hub', 'n2'), edge('hub', 'n2'), edge('hub', 'n3'), edge('hub', 'n1'), edge('hub', 'low')],
      }),
      channels: true,
    };
    const layout = placeGrid(s);
    const hub = layout.nodes.find((n) => n.id === 'hub')?.rect;
    if (!hub) throw new Error('missing');
    const ys = routeEdges(s, layout)
      .flatMap((r) => [r.points[0], r.points.at(-1)])
      .filter((p): p is Point => p !== undefined && p[0] === hub.x + hub.w)
      .map((p) => p[1])
      .sort((a, b) => a - b);
    expect(ys.slice(1).every((y, i) => y - (ys[i] ?? 0) >= s.metrics.portSpread)).toBe(true);
  });

  it('keeps a bent end out of the gap between two straight twins', () => {
    const s: GridSpec = {
      ...spec('a b', 'r1 r2', ['l@a/r1', 's@a/r2', 'v@b/r1', 'w@b/r2'], {
        edges: [edge('w', 'v'), edge('v', 'w'), edge('s', 'w'), edge('w', 's'), edge('l', 'w')],
      }),
      channels: true,
    };
    const routes = routeEdges(s, placeGrid(s));
    const xs = routes.slice(0, 2).map((r) => r.points[0]?.[0] ?? 0);
    const bent = routes[4]?.points.at(-1)?.[0] ?? 0;
    expect(routes[4]?.toSide).toBe('top');
    expect(bent < Math.min(...xs) || bent > Math.max(...xs)).toBe(true);
  });
});
