import { describe, expect, it } from 'vitest';
import { type LayeredEdge, type LayeredNode, layoutLayered } from '../src/index.js';

const METRICS = {
  colGap: 56,
  rowGapMin: 56,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 6,
  left: 32,
  top: 32,
};
const box = (id: string, width = 120): LayeredNode => ({ id, width, height: 44 });
const edge = (from: string, to: string, extra: Partial<LayeredEdge> = {}): LayeredEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank: 1,
  ...extra,
});
const lay = (nodes: LayeredNode[], edges: LayeredEdge[]) => layoutLayered({ nodes, edges, metrics: METRICS });
const centre = (l: ReturnType<typeof lay>, id: string) => {
  const r = l.nodes.find((n) => n.id === id)?.rect;
  return r ? r.x + r.w / 2 : Number.NaN;
};
const route = (l: ReturnType<typeof lay>, id: string) => l.routes.find((r) => r.edge === id)?.points ?? [];

describe('layered layout', () => {
  it('sets a single child exactly below its parent, so the line runs straight', () => {
    const l = lay([box('a', 200), box('b', 120)], [edge('a', 'b')]);
    expect(centre(l, 'b')).toBe(centre(l, 'a'));
    expect(route(l, 'a-b')).toHaveLength(2);
  });

  it('centres a parent over its children and draws one bundle as a fan from the middle of its side', () => {
    const l = lay(
      [box('p'), box('a'), box('b'), box('c')],
      ['a', 'b', 'c'].map((k) => edge('p', k, { bundle: 'x' })),
    );
    expect(centre(l, 'p')).toBe((centre(l, 'a') + centre(l, 'c')) / 2);
    const starts = ['a', 'b', 'c'].map((k) => route(l, `p-${k}`)[0]);
    expect(new Set(starts.map((p) => p?.join()))).toHaveProperty('size', 1);
    for (const k of ['a', 'b', 'c']) expect(route(l, `p-${k}`).at(-1)?.[0]).toBe(centre(l, k));
  });

  it('keeps a straight run of `lead` into every head and `tail` out of every start', () => {
    const l = lay([box('p'), box('a'), box('b')], [edge('p', 'a'), edge('p', 'b')]);
    for (const r of l.routes) {
      const [a, b] = [r.points.at(-2), r.points.at(-1)];
      const [s, t] = [r.points[0], r.points[1]];
      expect(Math.abs((b?.[1] ?? 0) - (a?.[1] ?? 0))).toBeGreaterThanOrEqual(METRICS.lead);
      expect(Math.abs((t?.[1] ?? 0) - (s?.[1] ?? 0))).toBeGreaterThanOrEqual(METRICS.tail);
    }
  });

  it('runs a long edge straight down through the layers it crosses, without a detour around the picture', () => {
    const nodes = [box('a'), box('b'), box('c'), box('d')];
    const l = lay(nodes, [edge('a', 'b'), edge('b', 'c'), edge('a', 'c'), edge('d', 'c')]);
    const long = route(l, 'a-c');
    const xs = long.map((p) => p[0]);
    const right = Math.max(...l.nodes.map((n) => n.rect.x + n.rect.w));
    expect(Math.max(...xs)).toBeLessThanOrEqual(right);
    expect(long.length).toBeLessThanOrEqual(4);
  });

  it('points the head of an upward edge up, into the bottom of the box above', () => {
    const l = lay([box('boss'), box('a')], [edge('a', 'boss', { rank: -1 })]);
    const r = l.routes[0];
    const boss = l.nodes.find((n) => n.id === 'boss')?.rect;
    expect(r?.points.at(-1)?.[1]).toBe((boss?.y ?? 0) + (boss?.h ?? 0));
    expect(r?.toSide).toBe('bottom');
  });

  it('draws an edge beside as a horizontal line between neighbours', () => {
    const l = lay([box('a'), box('b')], [edge('a', 'b', { rank: 0 })]);
    const points = route(l, 'a-b');
    expect(points).toHaveLength(2);
    expect(points[0]?.[1]).toBe(points[1]?.[1]);
  });

  it('gives crossing pieces of one gap their own tracks, and makes the gap high enough for them', () => {
    const nodes = [box('a'), box('b'), box('x'), box('y')];
    const l = lay(nodes, [edge('a', 'y'), edge('b', 'x'), edge('a', 'x'), edge('b', 'y')]);
    const flats = l.routes.flatMap((r) =>
      r.points.slice(1).flatMap((p, i) => (r.points[i]?.[1] === p[1] ? [p[1]] : [])),
    );
    const top = Math.min(...l.nodes.filter((n) => n.row === 1).map((n) => n.rect.y));
    for (const y of flats) expect(top - y).toBeGreaterThanOrEqual(METRICS.lead);
  });

  it('seats a label beside the start of its line and gives the same bytes twice', () => {
    const edges = [edge('a', 'b', { label: { text: 'nutzt', width: 30, size: 10 } })];
    const once = lay([box('a'), box('b')], edges);
    const label = once.labels[0];
    const start = route(once, 'a-b')[0];
    expect(label?.box.x).toBe((start?.[0] ?? 0) + METRICS.labelGap);
    expect(JSON.stringify(lay([box('a'), box('b')], edges))).toBe(JSON.stringify(once));
  });
});
