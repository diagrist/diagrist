import { describe, expect, it } from 'vitest';
import { type GridNode, type GridSpec, placeGrid, routeEdges } from '../src/index.js';
import { edge, spec } from './fixture.js';

/** A node whose top edge is taken from 14 to `to` pixels from its left corner, as a name cut into it. */
const named = (id: string, col: string, row: string, to: number): GridNode => ({
  id,
  col,
  row,
  reserve: { top: { from: 14, to } },
});

const routesOf = (s: GridSpec) => routeEdges(s, placeGrid(s));

describe('reserved stretches', () => {
  it('move a column of straight ends right of the widest stretch, so the spine stays straight', () => {
    const s = spec('a', 'r1 r2 r3', ['x@a/r1', named('y', 'a', 'r2', 90), named('z', 'a', 'r3', 130)], {
      edges: [edge('x', 'y'), edge('y', 'z')],
    });
    const xs = routesOf(s).flatMap((r) => r.points.map((p) => p[0]));
    const left = placeGrid(s).nodes[0]?.rect.x ?? 0;
    expect(new Set(xs)).toEqual(new Set([left + 130 + 16]));
  });

  it('leave an end where the side has no room beside the stretch, and leave unreserved sides alone', () => {
    const s = spec('a', 'r1 r2', ['x@a/r1', named('y', 'a', 'r2', 186)], { edges: [edge('x', 'y')] });
    const free = spec('a', 'r1 r2', ['x@a/r1', 'y@a/r2'], { edges: [edge('x', 'y')] });
    expect(routesOf(s)[0]?.points).toEqual(routesOf(free)[0]?.points);
  });

  it('keep an adaptive end beside a stretch counted from the middle of the side', () => {
    const crest = { top: { from: -22, to: 22, origin: 'middle' } } as const;
    const s = spec('a', 'r1 r2', ['x@a/r1', { id: 'y', col: 'a', row: 'r2', reserve: crest }], {
      edges: [edge('x', 'y')],
      adaptive: true,
    });
    const layout = placeGrid(s);
    const y = layout.nodes.find((n) => n.id === 'y')?.rect;
    const end = routeEdges(s, layout)[0]?.points.at(-1);
    if (!y || !end) throw new Error('missing');
    const middle = y.x + y.w / 2;
    expect(end[1]).toBe(y.y);
    expect(Math.abs(end[0] - middle)).toBeGreaterThanOrEqual(22 + 16);
  });
});
