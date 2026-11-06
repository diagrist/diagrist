import { checkPlacement, type LineInput, lineFindings } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import {
  type EdgeLabel,
  type EdgeText,
  type GridSpec,
  placedOf,
  placeGrid,
  pointAlong,
  type Route,
  routeEdges,
  signEdges,
} from '../src/index.js';
import { edge, group, spec } from './fixture.js';

const MARK = { w: 24, h: 16, room: 2 } as const;

/** A channel grid placed, routed and signed: a number 28 pixels after the start of every route, and the texts. */
function signed(s: GridSpec, texts: readonly EdgeText[]) {
  const spec = { ...s, channels: true };
  const layout = placeGrid(spec);
  const routes = routeEdges(spec, layout);
  const marks = routes.map((r, route) => {
    const { p } = pointAlong(r.points, 28);
    return { route, x: p[0], y: p[1] };
  });
  const out = signEdges(spec, layout, routes, texts, marks, { mark: MARK });
  return { spec, layout, routes, ...out };
}

/** What the kernel's line check reads of a signed grid. */
function lineInput(layout: ReturnType<typeof placeGrid>, routes: readonly Route[], labels: readonly EdgeLabel[]) {
  const input: LineInput = {
    nodes: layout.nodes.map((n) => ({ id: n.id, rect: n.rect })),
    routes: routes.map((r) => {
      const [from = '', to = ''] = r.edge.split('-');
      return { edge: r.edge, from, to, points: r.points };
    }),
    labels: labels.map((l, i) => ({ key: `${i}`, edge: routes[l.route]?.edge ?? '', box: l.box })),
    frames: layout.groups.map((g) => ({ id: g.id, rect: g.rect })),
  };
  return input;
}

describe('signs of a channel grid', () => {
  it('move a number off the border of the frame its line leaves', () => {
    const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], { groups: [group('f', ['x'])], edges: [edge('x', 'y')] });
    const { layout, marks } = signed(s, []);
    const frame = layout.groups[0]?.rect;
    const mark = marks[0];
    if (!frame || !mark) throw new Error('missing');
    const border = frame.x + frame.w;
    expect(mark.x - MARK.w / 2 > border || mark.x + MARK.w / 2 < border).toBe(true);
  });

  it('set the texts of two edges between the same boxes outward, clear of the other line', () => {
    const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], { edges: [edge('x', 'y'), edge('y', 'x')] });
    const texts = [
      { edge: 'x-y', name: 'sends', detail: 'MQTT' },
      { edge: 'y-x', name: 'reports', detail: 'MQTT' },
    ];
    const { layout, routes, labels } = signed(s, texts);
    expect(labels).toHaveLength(4);
    expect(lineFindings(lineInput(layout, routes, labels), { labelNear: 10 })).toEqual([]);
  });

  it('keep texts and numbers inside one frame around an end or outside every frame', () => {
    const s = spec('a b', 'r1 r2', ['x@a/r1', 'y@b/r2', 'z@b/r1'], {
      groups: [group('f', ['x']), group('g', ['y', 'z'])],
      edges: [edge('x', 'y'), edge('z', 'x')],
    });
    const texts = [
      { edge: 'x-y', name: 'a rather long name', detail: 'HTTPS/JSON' },
      { edge: 'z-x', name: 'answers', detail: 'webhook' },
    ];
    const { spec: channelled, layout, routes, labels, marks } = signed(s, texts);
    const numbers = marks.map((m) => ({
      route: m.route,
      rect: { x: m.x - MARK.w / 2, y: m.y - MARK.h / 2, w: MARK.w, h: MARK.h },
    }));
    const placed = placedOf(channelled, layout, routes, labels, numbers);
    expect(checkPlacement(placed, { width: layout.width, height: layout.bottom + 32 })).toEqual([]);
  });

  it('keep texts as far from the outline of a frame around an end as from a foreign line', () => {
    const s = spec('a b', 'r1 r2', ['x@a/r1', 'y@b/r1', 'z@b/r2'], {
      groups: [group('f', ['y', 'z'])],
      edges: [edge('x', 'y'), edge('y', 'z')],
    });
    const texts = [
      { edge: 'x-y', name: 'a rather long name', detail: 'HTTPS/JSON' },
      { edge: 'y-z', name: 'a rather long name', detail: 'HTTPS/JSON' },
    ];
    const { layout, labels } = signed(s, texts);
    const frame = layout.groups[0]?.rect;
    if (!frame) throw new Error('missing');
    const gaps = labels.map(({ box: b }) => {
      const dx = Math.max(frame.x - b.x - b.w, b.x - frame.x - frame.w);
      const dy = Math.max(frame.y - b.y - b.h, b.y - frame.y - frame.h);
      const inside = Math.min(
        b.x - frame.x,
        b.y - frame.y,
        frame.x + frame.w - b.x - b.w,
        frame.y + frame.h - b.y - b.h,
      );
      return dx > 0 || dy > 0 ? Math.max(dx, dy) : inside;
    });
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(6);
  });

  it('set a sign beside its line, never across a foreign line from it', () => {
    const s = { ...spec('a b', 'r', ['x@a/r', 'y@b/r'], { edges: [edge('x', 'y'), edge('y', 'x')] }), channels: true };
    const layout = placeGrid(s);
    const routes = routeEdges(s, layout);
    const [there, back] = routes.map((r) => r.points[0]?.[1] ?? 0);
    const on: readonly [number, number] = [308, there ?? 0];
    const below = (back ?? 0) > (there ?? 0) ? 1 : -1;
    const spots = [
      { at: [308, (there ?? 0) + below * 48] as const, on },
      { at: [308, (there ?? 0) - below * 24] as const, on },
    ];
    const { pins } = signEdges(s, layout, routes, [], [], { pins: { w: 24, h: 14, at: [{ route: 0, spots }] } });
    expect(pins).toEqual([spots[1]?.at]);
  });
});
