import { describe, expect, it } from 'vitest';
import { grow, placeGrid } from '../src/index.js';
import { group, inside, METRICS, overlap, spec } from './fixture.js';

const rectOf = (layout: ReturnType<typeof placeGrid>, id: string) => layout.nodes.find((n) => n.id === id)?.rect;

describe('placing a fixed grid', () => {
  it('puts each node into its cell and keeps columns with one prefix closer together', () => {
    const layout = placeGrid(spec('a b.1 b.2', 'top main', ['x@a/top', 'y@b.1/main', 'z@b.2/main']));
    expect(layout.cols.map((c) => [c.x, c.w])).toEqual([
      [48, 192],
      [48 + 192 + METRICS.colGap, 192],
      [48 + 192 + METRICS.colGap + 192 + METRICS.subColGap, 192],
    ]);
    expect(rectOf(layout, 'x')).toEqual({ x: 48, y: 128, w: 192, h: 56 });
    expect(rectOf(layout, 'y')?.y).toBe(128 + 56 + METRICS.rowGap);
    expect(layout.gutters.cols[0]).toBe((48 + 192 + 376) / 2);
  });

  it('stands the tracks of a gap in the middle of what the room kept at its borders leaves, else in its middle', () => {
    const s = spec('a b', 'r s', ['x@a/r', 'y@b/s']);
    const kept = (keep: readonly [number, number]) =>
      placeGrid({
        ...s,
        cols: [{ name: 'a', gap: 200, keep }, { name: 'b' }],
        rows: [{ name: 'r', keep }, { name: 's' }],
      });
    const plain = kept([0, 0]);
    const [lo, hi] = [48 + 192, 48 + 192 + 200];
    expect(plain.gutters.cols[0]).toBe((lo + hi) / 2);
    expect(kept([120, 0]).gutters.cols[0]).toBe((lo + 120 + hi) / 2);
    expect(kept([0, 40]).gutters.cols[0]).toBe((lo + hi - 40) / 2);
    expect(kept([150, 60]).gutters.cols[0]).toBe((lo + hi) / 2);
    const row = plain.rows[0];
    if (!row) throw new Error('missing');
    expect(kept([0, 40]).gutters.rows[0]).toBe(row.y + row.h + (METRICS.rowGap - 40) / 2);
  });

  it('stands a node with its own size in the middle of its cell and leaves out nodes in unknown places', () => {
    const layout = placeGrid(spec('a', 'r', [{ id: 'p', col: 'a', row: 'r', width: 40, height: 30 }, 'lost@b/r']));
    expect(rectOf(layout, 'p')).toEqual({ x: 48 + 96 - 20, y: 128 + 13, w: 40, h: 30 });
    expect(layout.nodes.map((n) => n.id)).toEqual(['p']);
  });

  it('gives an empty column of a channel grid no width, only its gaps, and keeps it in other grids', () => {
    const s = spec('a b c', 'r', ['x@a/r', 'y@c/r']);
    const gapOf = (layout: ReturnType<typeof placeGrid>) => {
      const [x, y] = ['x', 'y'].map((id) => layout.nodes.find((n) => n.id === id)?.rect);
      return (y?.x ?? 0) - ((x?.x ?? 0) + (x?.w ?? 0));
    };
    expect(gapOf(placeGrid({ ...s, channels: true }))).toBe(2 * METRICS.colGap);
    expect(gapOf(placeGrid(s))).toBe(2 * METRICS.colGap + METRICS.nodeW);
    const spanned = spec('a b c', 'r s', ['x@a/r', 'y@c/r', { id: 'z', col: 'a', row: 's', to: { col: 'b' } }]);
    expect(gapOf(placeGrid({ ...spanned, channels: true }))).toBe(2 * METRICS.colGap + METRICS.nodeW);
  });

  it('wraps frames around their members with pads, nested ones inside their parents, parents first', () => {
    const layout = placeGrid(
      spec('a b', 'r', ['x@a/r', 'y@b/r'], {
        groups: [group('inner', ['x'], { parent: 'outer' }), group('outer', ['y'], { minWidth: 900 })],
      }),
    );
    const [outer, inner] = layout.groups;
    expect(layout.groups.map((g) => g.id)).toEqual(['outer', 'inner']);
    const x = rectOf(layout, 'x');
    if (!outer || !inner || !x) throw new Error('missing');
    expect(inner.rect).toEqual({ x: x.x - 24, y: x.y - 56, w: 192 + 48, h: 56 + 56 + 24 });
    expect(inside(inner.rect, outer.rect)).toBe(true);
    expect(outer.rect.w).toBe(900);
  });

  it('lays the lanes beyond the grid one lane gap outside its frames and two outside its boxes', () => {
    const bare = placeGrid(spec('a b', 'r', ['x@a/r', 'y@b/r']));
    const row = bare.rows[0];
    if (!row) throw new Error('missing');
    expect(bare.gutters.margins?.rows).toEqual([row.y - 2 * METRICS.laneGap, row.y + row.h + 2 * METRICS.laneGap]);
    const framed = placeGrid(spec('a b', 'r', ['x@a/r', 'y@b/r'], { groups: [group('f', ['x'])] }));
    const frame = framed.groups[0]?.rect;
    if (!frame) throw new Error('missing');
    expect(framed.gutters.margins?.rows).toEqual([frame.y - METRICS.laneGap, frame.y + frame.h + METRICS.laneGap]);
  });
});

describe('placing an adaptive grid', () => {
  it('widens columns to what their nodes ask and keeps nodes of one row apart', () => {
    const wide = { id: 'w', col: 'a', row: 'r', demand: { width: 400, exact: false } };
    const layout = placeGrid(spec('a b', 'r', [wide, 'n@b/r'], { adaptive: true }));
    expect(layout.cols[0]?.w).toBe(400);
    const [w, n] = [rectOf(layout, 'w'), rectOf(layout, 'n')];
    if (!w || !n) throw new Error('missing');
    expect(overlap(w, n)).toBe(false);
  });

  it('lets a node span columns and shares an area between slots', () => {
    const nodes = [
      { id: 'top', col: 'a', row: 'r1', to: { col: 'c' } },
      { id: 'left', col: 'a', row: 'r2', to: { col: 'c' }, slot: { index: 1, count: 2 } },
      { id: 'right', col: 'a', row: 'r2', to: { col: 'c' }, slot: { index: 2, count: 2 } },
    ];
    const layout = placeGrid(spec('a b c', 'r1 r2', nodes, { adaptive: true }));
    const [top, left, right] = ['top', 'left', 'right'].map((id) => rectOf(layout, id));
    const last = layout.cols[2];
    if (!top || !left || !right || !last) throw new Error('missing');
    expect(top.x + top.w).toBe(last.x + last.w);
    expect(left.w).toBe(right.w);
    expect(right.x - (left.x + left.w)).toBe(METRICS.subColGap);
  });

  it('moves columns apart so the pads of frames side by side fit between them', () => {
    const groups = [group('g1', ['x']), group('g2', ['y'])];
    const layout = placeGrid(spec('a b', 'r', ['x@a/r', 'y@b/r'], { groups, adaptive: true }));
    const [g1, g2] = layout.groups;
    if (!g1 || !g2) throw new Error('missing');
    expect(overlap(g1.rect, g2.rect)).toBe(false);
  });

  it('gives the same numbers for the same spec', () => {
    const s = spec('a b', 'r1 r2 r3', ['x@a/r1', 'y@b/r3'], { adaptive: true, groups: [group('g', ['x', 'y'])] });
    expect(placeGrid(s)).toEqual(placeGrid(structuredClone(s)));
  });
});

describe('a second run', () => {
  it('grows frames by extra pads on top of their own', () => {
    const s = spec('a', 'r', ['x@a/r'], { groups: [group('g', ['x'])] });
    const before = placeGrid(s).groups[0]?.rect;
    const after = placeGrid(grow(s, new Map([['g', { top: 0, bottom: 0, left: 0, right: 30 }]]))).groups[0]?.rect;
    expect(after).toEqual(before && { ...before, w: before.w + 30 });
  });
});
