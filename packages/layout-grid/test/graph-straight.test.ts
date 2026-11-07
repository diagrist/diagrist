import { type Rect, segmentMeetsRect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { type GraphEdge, type GraphNode, type LayoutGraph, layoutGraph } from '../src/index.js';

const METRICS = {
  colGap: 40,
  rowGapMin: 112,
  track: 16,
  portGap: 16,
  lead: 16,
  tail: 16,
  labelGap: 10,
  left: 48,
  top: 72,
};
const oval = (id: string, width = 120): GraphNode => ({ id, width, height: 48, shape: 'ellipse' });
const line = (from: string, to: string, more: Partial<GraphEdge> = {}): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank: 'down',
  profile: 'straight',
  ...more,
});
const graph = (g: Omit<LayoutGraph, 'metrics'>): LayoutGraph => ({ ...g, metrics: METRICS });
const rectOf = (l: ReturnType<typeof layoutGraph>, id: string) =>
  l.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
const route = (l: ReturnType<typeof layoutGraph>, id: string) => l.routes.find((r) => r.edge === id)?.points ?? [];

describe('straight lines in the layout graph', () => {
  it('runs one slanted piece from outline to outline, its texts beside the middle and at the ends', () => {
    const l = layoutGraph(
      graph({
        nodes: [oval('a'), oval('b'), oval('c')],
        edges: [
          line('a', 'b', {
            label: { text: '«include»', width: 54, size: 10 },
            ends: { from: { text: '1', width: 6, size: 10 }, to: { text: '0..*', width: 24, size: 10 } },
          }),
          line('a', 'c'),
        ],
        given: { direction: 'right' },
      }),
    );
    const points = route(l, 'a-b');
    expect(points).toHaveLength(2);
    const [p, q] = points as [[number, number], [number, number]];
    const [a, b] = [rectOf(l, 'a'), rectOf(l, 'b')];
    const onOval = (pt: [number, number], r: typeof a) =>
      ((pt[0] - (r.x + r.w / 2)) / (r.w / 2)) ** 2 + ((pt[1] - (r.y + r.h / 2)) / (r.h / 2)) ** 2;
    expect(onOval(p, a)).toBeCloseTo(1, 1);
    expect(onOval(q, b)).toBeCloseTo(1, 1);
    const texts = l.labels.filter((t) => l.routes[t.route]?.edge === 'a-b').map((t) => t.text);
    expect(texts.sort()).toEqual(['0..*', '1', '«include»']);
    expect(l.placed.filter((x) => x.key.startsWith('a-b.label.'))).toHaveLength(3);
  });

  it('moves a box out of the way of a straight line that would run through it', () => {
    const l = layoutGraph(
      graph({
        nodes: [oval('left'), oval('middle'), oval('other'), oval('right')],
        edges: [line('left', 'right'), line('left', 'middle'), line('other', 'right')],
        given: { ranks: [['left'], ['middle', 'other'], ['right']], order: 'free', direction: 'right' },
      }),
    );
    for (const r of l.routes) {
      const [p, q] = [r.points[0], r.points.at(-1)] as [[number, number], [number, number]];
      const [from, to] = r.edge.split('-');
      expect(r.points).toHaveLength(2);
      for (const n of l.nodes)
        if (n.id !== from && n.id !== to) expect(segmentMeetsRect(p, q, n.rect), `${r.edge} ${n.id}`).toBe(false);
    }
  });

  it('puts the end an edge beside names first: above the other where the layers run right', () => {
    const special = { ...line('special', 'general', { rank: 'beside' }), first: 'to' as const };
    const l = layoutGraph(
      graph({
        nodes: [oval('general'), oval('special'), oval('x')],
        edges: [special, line('x', 'special')],
        given: { ranks: [['x'], ['special', 'general']], order: 'free', direction: 'right' },
      }),
    );
    expect(rectOf(l, 'general').y).toBeLessThan(rectOf(l, 'special').y);
  });

  it('packs the members of a frame in their column, takes along what hangs on them only, closes the frame above them', () => {
    const tall: GraphNode = { id: 'wall', width: 8, height: 400 };
    const g = (pack: boolean) =>
      graph({
        nodes: [oval('top'), tall, oval('low'), oval('a'), oval('b'), oval('c'), oval('pin')],
        edges: [
          line('top', 'a'),
          line('low', 'b'),
          line('low', 'c'),
          line('wall', 'b', { hidden: true }),
          line('a', 'pin'),
        ],
        containers: [
          { id: 'f', kind: 'frame', members: ['a', 'b', 'c'], pad: 40, top: 44, head: { width: 80, height: 24 } },
        ],
        given: {
          ranks: [['top', 'wall', 'low'], ['a', 'b', 'c'], ['pin']],
          order: 'kept',
          direction: 'right',
          pack,
        },
      });
    const [loose, packed] = [layoutGraph(g(false)), layoutGraph(g(true))];
    const gaps = (l: ReturnType<typeof layoutGraph>) => {
      const [c, b, a] = ['c', 'b', 'a'].map((id) => rectOf(l, id)) as [Rect, Rect, Rect];
      return [b.y - (c.y + c.h), a.y - (b.y + b.h)];
    };
    expect(Math.max(...gaps(loose))).toBeGreaterThan(300);
    expect(gaps(packed)).toEqual([METRICS.colGap, METRICS.colGap]);
    const frame = packed.frames?.[0]?.rect as Rect;
    expect(frame.y).toBe(rectOf(packed, 'c').y - 44);
    expect(frame.y + frame.h).toBe(rectOf(packed, 'a').y + rectOf(packed, 'a').h + 40);
    expect(rectOf(packed, 'top')).toEqual(rectOf(loose, 'top'));
    expect(rectOf(packed, 'a').y).toBeLessThan(rectOf(loose, 'a').y);
    expect(rectOf(packed, 'pin').y).toBe(rectOf(packed, 'a').y);
  });
});
