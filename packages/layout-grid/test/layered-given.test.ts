import { describe, expect, it } from 'vitest';
import { type LayeredEdge, type LayeredNode, type LayeredSpec, layoutLayered } from '../src/index.js';

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
const lay = (spec: Omit<LayeredSpec, 'metrics'>) => layoutLayered({ ...spec, metrics: METRICS });
const rectOf = (l: ReturnType<typeof lay>, id: string) =>
  l.nodes.find((n) => n.id === id)?.rect ?? { x: Number.NaN, y: Number.NaN, w: 0, h: 0 };
const centre = (l: ReturnType<typeof lay>, id: string) => rectOf(l, id).x + rectOf(l, id).w / 2;
const route = (l: ReturnType<typeof lay>, id: string) => l.routes.find((r) => r.edge === id)?.points ?? [];

describe('layered layout as the kind arranged it', () => {
  it('keeps the layers and the order the kind gives, against the pull of the edges', () => {
    const nodes = [box('a'), box('b'), box('c'), box('d')];
    const edges = [edge('a', 'd'), edge('b', 'c')];
    const l = lay({
      nodes,
      edges,
      layers: [
        ['a', 'b'],
        ['c', 'd'],
      ],
    });
    expect(rectOf(l, 'a').y).toBe(rectOf(l, 'b').y);
    expect(rectOf(l, 'c').y).toBeGreaterThan(rectOf(l, 'a').y);
    expect(centre(l, 'a')).toBeLessThan(centre(l, 'b'));
    expect(centre(l, 'c')).toBeLessThan(centre(l, 'd'));
  });

  it('draws no line for a hidden edge but lets it pull, so a box hangs below the middle of two', () => {
    const nodes = [box('a'), box('b'), box('c')];
    const edges = [edge('a', 'b', { rank: 0 }), edge('a', 'c', { hidden: true }), edge('b', 'c', { hidden: true })];
    const l = lay({ nodes, edges, layers: [['a', 'b'], ['c']] });
    expect(l.routes.map((r) => r.edge)).toEqual(['a-b']);
    expect(centre(l, 'c')).toBe((centre(l, 'a') + centre(l, 'b')) / 2);
  });

  it('keeps the straight run an edge asks for at its ends, and the room it asks for beside', () => {
    const nodes = [box('a'), box('b'), box('c')];
    const edges = [edge('a', 'b', { run: { from: 60, to: 50 } }), edge('b', 'c', { rank: 0, room: 300 })];
    const l = lay({ nodes, edges, layers: [['a'], ['b', 'c']] });
    expect(rectOf(l, 'b').y - (rectOf(l, 'a').y + rectOf(l, 'a').h)).toBeGreaterThanOrEqual(110);
    expect(rectOf(l, 'c').x - (rectOf(l, 'b').x + rectOf(l, 'b').w)).toBe(300);
  });

  it('sets a box with partners only beside it next to them, not where its layer began', () => {
    const nodes = [box('top'), box('a'), box('b'), box('lone')];
    const edges = [edge('top', 'b'), edge('b', 'lone', { rank: 0 }), edge('top', 'a')];
    const l = lay({ nodes, edges, layers: [['top'], ['a', 'b', 'lone']] });
    expect(rectOf(l, 'lone').x - (rectOf(l, 'b').x + rectOf(l, 'b').w)).toBe(METRICS.colGap);
  });
});

describe('frames of a layered layout', () => {
  const head = { width: 60, height: 20 };
  const frame = (id: string, members: string[], parent?: string) => ({
    id,
    members,
    pad: 20,
    top: 40,
    head,
    ...(parent ? { parent } : {}),
  });

  it('stand around their boxes with room for the head on top, and keep foreign boxes outside', () => {
    const nodes = [box('a'), box('b'), box('c'), box('d')];
    const edges = [edge('a', 'c'), edge('b', 'd')];
    const l = lay({
      nodes,
      edges,
      layers: [
        ['a', 'b'],
        ['c', 'd'],
      ],
      frames: [frame('f', ['a', 'c'])],
    });
    const f = l.frames?.find((g) => g.id === 'f')?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    for (const id of ['a', 'c']) {
      const r = rectOf(l, id);
      expect(r.x - f.x).toBeGreaterThanOrEqual(20);
      expect(f.x + f.w - (r.x + r.w)).toBeGreaterThanOrEqual(20);
    }
    expect(rectOf(l, 'a').y - f.y).toBe(40);
    expect(f.y + f.h - (rectOf(l, 'c').y + rectOf(l, 'c').h)).toBe(20);
    expect(f.y).toBe(METRICS.top);
    expect(rectOf(l, 'b').x - (f.x + f.w)).toBeGreaterThanOrEqual(METRICS.colGap);
  });

  it('nest, the parent around the child with its own pads, parents first', () => {
    const nodes = [box('a'), box('b')];
    const frames = [frame('outer', ['b']), frame('inner', ['a'], 'outer')];
    const l = lay({ nodes, edges: [edge('a', 'b')], layers: [['a'], ['b']], frames });
    expect(l.frames?.map((g) => g.id)).toEqual(['outer', 'inner']);
    const [outer, inner] = [l.frames?.[0]?.rect, l.frames?.[1]?.rect];
    expect(inner && outer && inner.x - outer.x).toBe(20);
    expect(inner && outer && inner.y - outer.y).toBe(40);
  });

  it('grow to the left when a line from outside would cross their head', () => {
    const nodes = [box('a', 40), box('b', 200)];
    const wide = { ...frame('f', ['b']), head: { width: 160, height: 20 } };
    const l = lay({ nodes, edges: [edge('a', 'b')], layers: [['a'], ['b']], frames: [wide] });
    const f = l.frames?.[0]?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    const x = route(l, 'a-b')[0]?.[0] ?? 0;
    expect(rectOf(l, 'b').x - f.x).toBeGreaterThan(20);
    expect(f.x + 160 + 12).toBe(x);
  });
});
