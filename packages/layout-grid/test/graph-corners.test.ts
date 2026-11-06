import { describe, expect, it } from 'vitest';
import { type GraphContainer, type GraphEdge, type GraphNode, type LayoutGraph, layoutGraph } from '../src/index.js';

const METRICS = {
  colGap: 40,
  rowGapMin: 48,
  track: 12,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 6,
  left: 48,
  top: 32,
};
const box = (id: string, width = 120): GraphNode => ({ id, width, height: 40 });
const diamond = (id: string): GraphNode => ({ id, width: 32, height: 32, sides: ['top', 'bottom', 'left', 'right'] });
const bar = (id: string): GraphNode => ({ id, width: 72, height: 6, shape: 'bar' });
const edge = (from: string, to: string, more: Partial<GraphEdge> = {}): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank: 'down',
  ...more,
});
const lane = (id: string, members: string[]): GraphContainer => ({
  id,
  kind: 'lane',
  members,
  pad: 24,
  top: 56,
  head: { width: 176, height: 32 },
});
const graph = (g: Omit<LayoutGraph, 'metrics'>): LayoutGraph => ({ ...g, metrics: METRICS });
const rectOf = (l: ReturnType<typeof layoutGraph>, id: string) =>
  l.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
const route = (l: ReturnType<typeof layoutGraph>, id: string) => l.routes.find((r) => r.edge === id)?.points ?? [];
const column = (l: ReturnType<typeof layoutGraph>, id: string) =>
  l.lanes?.find((c) => c.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };

describe('ends at the corners of a node with sides', () => {
  const l = layoutGraph(
    graph({
      nodes: [box('a'), diamond('d'), box('yes'), box('no'), diamond('m'), box('z')],
      edges: [
        edge('a', 'd'),
        edge('d', 'yes', { bundle: 'out:d' }),
        edge('d', 'no', { bundle: 'out:d' }),
        edge('yes', 'm', { bundle: 'into:m' }),
        edge('no', 'm', { bundle: 'into:m' }),
        edge('m', 'z'),
      ],
    }),
  );
  const [d, m] = [rectOf(l, 'd'), rectOf(l, 'm')];

  it('lets two branches leave a diamond at its left and right corner and enter the next at its corners', () => {
    const starts = ['d-yes', 'd-no'].map((id) => route(l, id)[0]);
    expect(starts.map((p) => p?.[1])).toEqual([d.y + d.h / 2, d.y + d.h / 2]);
    expect(starts.map((p) => p?.[0]).sort((p, q) => (p ?? 0) - (q ?? 0))).toEqual([d.x, d.x + d.w]);
    const ends = ['yes-m', 'no-m'].map((id) => route(l, id).at(-1));
    expect(ends.map((p) => p?.[1])).toEqual([m.y + m.h / 2, m.y + m.h / 2]);
    expect(ends.map((p) => p?.[0]).sort((p, q) => (p ?? 0) - (q ?? 0))).toEqual([m.x, m.x + m.w]);
  });

  it('meets the single lines above and below at the tip', () => {
    expect(route(l, 'a-d').at(-1)).toEqual([d.x + d.w / 2, d.y]);
    expect(route(l, 'm-z')[0]).toEqual([m.x + m.w / 2, m.y + m.h]);
  });
});

describe('bars', () => {
  it('stretch over their branches, each leaving or entering straight above or below its box', () => {
    const l = layoutGraph(
      graph({
        nodes: [box('a'), bar('fork'), box('b1'), box('b2'), box('b3'), bar('join'), box('z')],
        edges: [
          edge('a', 'fork'),
          ...['b1', 'b2', 'b3'].flatMap((b) => [edge('fork', b), edge(b, 'join')]),
          edge('join', 'z'),
        ],
      }),
    );
    for (const b of ['b1', 'b2', 'b3']) {
      const [out, into] = [route(l, `fork-${b}`), route(l, `${b}-join`)];
      const r = rectOf(l, b);
      expect(
        out.map((p) => p[0]),
        b,
      ).toEqual([r.x + r.w / 2, r.x + r.w / 2]);
      expect(
        into.map((p) => p[0]),
        b,
      ).toEqual([r.x + r.w / 2, r.x + r.w / 2]);
      for (const id of ['fork', 'join']) {
        const s = rectOf(l, id);
        expect(s.x, `${id} over ${b}`).toBeLessThan(r.x + r.w / 2);
        expect(s.x + s.w, `${id} over ${b}`).toBeGreaterThan(r.x + r.w / 2);
      }
    }
  });
});

describe('lanes with loops and hand-overs', () => {
  const l = layoutGraph(
    graph({
      nodes: ['a', 'b', 'c', 'd', 'x', 'y', 'q'].map((id) => box(id)),
      edges: [
        edge('a', 'b'),
        edge('b', 'c'),
        edge('c', 'd'),
        edge('c', 'a', { profile: 'back' }),
        edge('x', 'y', { rank: 'beside' }),
        edge('d', 'x'),
        edge('d', 'q'),
      ],
      containers: [lane('left', ['a', 'b', 'c', 'd', 'x']), lane('middle', ['q']), lane('right', ['y'])],
    }),
  );

  it('runs a loop back on a rail inside the column of its own lane, clear of its border', () => {
    const rail = route(l, 'c-a');
    const xs = rail.slice(1, -1).map((p) => p[0]);
    const col = column(l, 'left');
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(col.x + METRICS.lead);
      expect(x).toBeLessThanOrEqual(col.x + col.w - METRICS.lead);
    }
  });

  it('runs a hand-over a layer down where its line would pass a box of a lane between', () => {
    const [x, y, q] = [rectOf(l, 'x'), rectOf(l, 'y'), rectOf(l, 'q')];
    expect(q.y).toBe(x.y);
    expect(y.y).toBeGreaterThan(x.y);
  });

  it('keeps a hand-over beside where nothing stands between, its line from side to side', () => {
    const free = layoutGraph(
      graph({
        nodes: ['x', 'y'].map((id) => box(id)),
        edges: [edge('x', 'y', { rank: 'beside' })],
        containers: [lane('left', ['x']), lane('right', ['y'])],
      }),
    );
    expect(rectOf(free, 'y').y).toBe(rectOf(free, 'x').y);
    expect(new Set(route(free, 'x-y').map((p) => p[1])).size).toBe(1);
  });
});
