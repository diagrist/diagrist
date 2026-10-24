import type { Point } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { type EdgeLabel, layerGraph, placeGrid, placeLabels, routeEdges } from '../src/index.js';
import { edge, METRICS, spec } from './fixture.js';

/** Data a kind hands over beyond nodes and frames: sides, obstacles, its own routes, rows, labels, layers. */
describe('data of a kind', () => {
  it('puts nodes of `last` below every other node of their part', () => {
    const edges = [
      { from: 'a', to: 'b', rank: 1 },
      { from: 'b', to: 'c', rank: 1 },
      { from: 'a', to: 'end', rank: 1 },
    ] as const;
    expect(layerGraph({ nodes: ['a', 'b', 'c', 'end'], edges, maxPerLayer: 5 }).layers).toEqual([
      ['a'],
      ['b', 'end'],
      ['c'],
    ]);
    const last = layerGraph({ nodes: ['a', 'b', 'c', 'end'], edges, maxPerLayer: 5, last: ['end'] });
    expect(last.layers).toEqual([['a'], ['b'], ['c'], ['end']]);
  });

  it('lets a row be lower than nodeH with `rowMin`', () => {
    const nodes = [{ id: 'dot', col: 'a', row: 'r1', width: 20, height: 20 }, 'x@a/r2'];
    expect(placeGrid(spec('a', 'r1 r2', nodes)).rows[0]?.h).toBe(56);
    expect(placeGrid(spec('a', 'r1 r2', nodes, { metrics: { ...METRICS, rowMin: 0 } })).rows[0]?.h).toBe(20);
  });

  it('routes with the sides the kind chose per attempt and around the rectangles it names', () => {
    const s = spec('a b', 'r1 r2 r3', ['x@b/r1', 'y@b/r3', 'z@a/r2'], { adaptive: true });
    const plain = (() => {
      const e = { ...s, edges: [edge('y', 'x')] };
      return routeEdges(e, placeGrid(e))[0];
    })();
    const sides = Array.from({ length: 6 }, () => ['left', 'left'] as const);
    const chosen = { ...s, edges: [edge('y', 'x', { sides })] };
    const route = routeEdges(chosen, placeGrid(chosen))[0];
    expect([route?.fromSide, route?.toSide]).toEqual(['left', 'left']);
    expect([plain?.fromSide, plain?.toSide]).not.toEqual(['left', 'left']);
    const layout = placeGrid(chosen);
    const x = layout.nodes.find((n) => n.id === 'x')?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    const wall = { x: x.x - 40, y: x.y + x.h + 16, w: 39, h: 150 };
    const around = { ...chosen, edges: [edge('y', 'x', { sides, avoid: [wall] })] };
    const avoided = routeEdges(around, layout)[0];
    expect(avoided?.unroutable).toBeUndefined();
    const through = (avoided?.points ?? []).slice(1).some((q, i) => {
      const p = avoided?.points[i] ?? q;
      return (
        Math.min(p[0], q[0]) < wall.x + wall.w &&
        Math.max(p[0], q[0]) > wall.x &&
        Math.min(p[1], q[1]) < wall.y + wall.h &&
        Math.max(p[1], q[1]) > wall.y
      );
    });
    expect(through).toBe(false);
    expect(route?.points.some(([px]) => px > wall.x && px < wall.x + wall.w)).toBe(true);
  });

  it('takes a route the kind laid itself as it is and keeps the sides it touches free for others', () => {
    const s = spec('a b', 'r1 r2', ['x@a/r1', 'y@b/r2'], { adaptive: true });
    const layout = placeGrid(s);
    const x = layout.nodes.find((n) => n.id === 'x')?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    const right = x.x + x.w;
    const points: Point[] = [
      [right, x.y + 10],
      [right + 30, x.y + 10],
      [right + 30, x.y - 30],
      [right - 30, x.y - 30],
      [right - 30, x.y],
    ];
    const own = {
      ...s,
      edges: [edge('x', 'x', { route: { points, fromSide: 'right', toSide: 'top' } }), edge('x', 'y')],
    };
    const [loop, other] = routeEdges(own, layout);
    expect(loop?.points).toEqual(points);
    const start = other?.points[0] ?? [0, 0];
    if (other?.fromSide === 'right') expect(start[1] < x.y + 10 - 16 || start[1] > x.y + 10 + 16).toBe(true);
  });

  it('keeps labels a kind placed on a free spot, and moves those on a node', () => {
    const s = spec('a b', 'r1', ['x@a/r1', 'y@b/r1'], { adaptive: true, edges: [edge('x', 'y')] });
    const layout = placeGrid(s);
    const routes = routeEdges(s, layout);
    const label = (y: number): EdgeLabel => ({
      text: 'go',
      x: 300,
      y,
      anchor: 'middle',
      box: { x: 290, y: y - 10, w: 20, h: 12 },
      route: 0,
      part: 'name',
    });
    expect(placeLabels(s, layout, routes, [label(60)])[0]?.y).toBe(60);
    const node = layout.nodes[0]?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    const onNode = { ...label(node.y + 20), x: node.x + 20, box: { x: node.x + 10, y: node.y + 10, w: 20, h: 12 } };
    expect(placeLabels(s, layout, routes, [onNode])[0]?.y).not.toBe(onNode.y);
  });
});
