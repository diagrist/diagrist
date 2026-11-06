import { describe, expect, it } from 'vitest';
import { type GraphContainer, type GraphEdge, type GraphNode, type LayoutGraph, layoutGraph } from '../src/index.js';

const METRICS = {
  colGap: 56,
  rowGapMin: 56,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 6,
  left: 48,
  top: 32,
};
const box = (id: string, width = 120): GraphNode => ({ id, width, height: 44 });
const point = (id: string, dock: string): GraphNode => ({ id, width: 16, height: 16, shape: 'ellipse', dock });
const edge = (from: string, to: string, rank: GraphEdge['rank'] = 'down'): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank,
});
const frame = (id: string, members: string[], more: Partial<GraphContainer> = {}): GraphContainer => ({
  id,
  kind: 'frame',
  members,
  pad: 24,
  top: 40,
  head: { width: 60, height: 20 },
  ...more,
});
const graph = (g: Omit<LayoutGraph, 'metrics'>): LayoutGraph => ({ ...g, metrics: METRICS });
const rectOf = (l: ReturnType<typeof layoutGraph>, id: string) =>
  l.nodes.find((n) => n.id === id)?.rect ?? l.frames?.find((f) => f.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
const route = (l: ReturnType<typeof layoutGraph>, id: string) => l.routes.find((r) => r.edge === id)?.points ?? [];
const mid = (r: { x: number; y: number; w: number; h: number }): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];

describe('the stages around the layered ones', () => {
  it('fills a frame with its parts side by side, meeting without a gap and reaching its sides and bottom', () => {
    const l = layoutGraph(
      graph({
        nodes: [box('top'), box('a'), box('b'), box('c')],
        edges: [edge('top', 'a'), edge('top', 'b'), edge('b', 'c')],
        containers: [
          frame('f', [], { pad: 0 }),
          frame('p', ['a'], { kind: 'part', parent: 'f' }),
          frame('q', ['b', 'c'], { kind: 'part', parent: 'f' }),
        ],
      }),
    );
    const [f, p, q] = ['f', 'p', 'q'].map((id) => rectOf(l, id));
    const [left, right] = [p, q].sort((x, y) => (x?.x ?? 0) - (y?.x ?? 0));
    expect((left?.x ?? 0) + (left?.w ?? 0)).toBe(right?.x);
    expect(left?.x).toBe(f?.x);
    expect((right?.x ?? 0) + (right?.w ?? 0)).toBe((f?.x ?? 0) + (f?.w ?? 0));
    for (const r of [p, q]) expect((r?.y ?? 0) + (r?.h ?? 0)).toBe((f?.y ?? 0) + (f?.h ?? 0));
  });

  it('stretches a bar over its branches, each leaving it straight down', () => {
    const l = layoutGraph(
      graph({
        nodes: [{ id: 'bar', width: 40, height: 6, shape: 'bar' }, box('a'), box('b'), box('c')],
        edges: [edge('bar', 'a'), edge('bar', 'b'), edge('bar', 'c')],
      }),
    );
    const bar = rectOf(l, 'bar');
    for (const id of ['a', 'b', 'c']) {
      const points = route(l, `bar-${id}`);
      expect(points).toHaveLength(2);
      expect(points[0]?.[1]).toBe(bar.y + bar.h);
      expect(points[0]?.[0]).toBeGreaterThan(bar.x);
      expect(points[0]?.[0]).toBeLessThan(bar.x + bar.w);
    }
    expect(bar.w).toBeGreaterThan(rectOf(l, 'c').x + rectOf(l, 'c').w - rectOf(l, 'a').x - 2 * 120);
  });

  it('puts a docked node where a line through it crosses the outline of its frame, the line cut around it', () => {
    const l = layoutGraph(
      graph({
        nodes: [box('out'), box('in'), point('d', 'f')],
        edges: [edge('out', 'd'), edge('d', 'in')],
        containers: [frame('f', ['in'])],
      }),
    );
    const [f, d] = [rectOf(l, 'f'), rectOf(l, 'd')];
    const [x, y] = mid(d);
    expect(y).toBe(f.y);
    expect(route(l, 'out-d').at(-1)).toEqual([x, y - 8]);
    expect(route(l, 'd-in')[0]).toEqual([x, y + 8]);
  });

  it('puts a docked node of a box at the end of its line on the box, and one with a line only inside on the side', () => {
    const l = layoutGraph(
      graph({
        nodes: [box('a'), box('host'), point('p', 'host'), box('in'), point('q', 'f')],
        edges: [edge('a', 'p'), edge('q', 'in')],
        containers: [frame('f', ['in'])],
      }),
    );
    const [host, p] = [rectOf(l, 'host'), rectOf(l, 'p')];
    expect(mid(p)[1]).toBe(host.y);
    expect(route(l, 'a-p').at(-1)?.[1]).toBe(host.y - 8);
    const [f, q] = [rectOf(l, 'f'), rectOf(l, 'q')];
    expect([f.x, f.x + f.w]).toContain(mid(q)[0]);
    expect(route(l, 'q-in')[0]?.[1]).toBe(mid(q)[1]);
  });

  it('turns the layers to run right, texts above their lines', () => {
    const label = { text: 'weiter', width: 40, size: 11 };
    const l = layoutGraph(
      graph({
        nodes: [box('a'), box('b'), box('c')],
        edges: [{ ...edge('a', 'b'), label }, edge('b', 'c')],
        given: { direction: 'right' },
      }),
    );
    const [a, b, c] = [rectOf(l, 'a'), rectOf(l, 'b'), rectOf(l, 'c')];
    expect(a.x + a.w).toBeLessThan(b.x);
    expect(b.x + b.w).toBeLessThan(c.x);
    expect(mid(a)[1]).toBe(mid(b)[1]);
    const line = route(l, 'a-b');
    expect(line.every((p) => p[1] === line[0]?.[1])).toBe(true);
    const text = l.labels.find((t) => l.routes[t.route]?.edge === 'a-b');
    expect(text?.text).toBe('weiter');
    expect((text?.box.y ?? 0) + (text?.box.h ?? 0)).toBeLessThanOrEqual(line[0]?.[1] ?? 0);
  });
});
