import { describe, expect, it } from 'vitest';
import { type GraphEdge, type GraphNode, type LayoutGraph, layoutGraph } from '../src/index.js';

const METRICS = {
  colGap: 64,
  rowGapMin: 72,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 8,
  left: 48,
  top: 32,
};
const box = (id: string, width = 120): GraphNode => ({ id, width, height: 48 });
const label = (text: string) => ({ text, width: 6 * text.length, size: 10 });
const rail = (from: string, to: string, text?: string): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank: 'down',
  profile: 'rail',
  ...(text === undefined ? {} : { label: label(text) }),
});
const flow = (g: Omit<LayoutGraph, 'metrics'>): LayoutGraph => ({ ...g, metrics: METRICS });
const rectOf = (l: ReturnType<typeof layoutGraph>, id: string) =>
  l.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
const routeOf = (l: ReturnType<typeof layoutGraph>, id: string) => l.routes.find((r) => r.edge === id);

/** A chain a → b → c → d with lines back up and one past a layer, all of the rail profile. */
const chain = flow({
  nodes: [box('a'), box('b'), box('c'), box('d'), box('e', 20)],
  edges: [
    rail('a', 'b'),
    rail('b', 'c'),
    rail('c', 'd'),
    rail('b', 'a', 'zurück'),
    rail('d', 'b', 'noch einmal'),
    rail('a', 'e', 'Ende'),
  ],
  given: { perLayer: Number.POSITIVE_INFINITY, last: ['e'] },
});

describe('rails', () => {
  it('keep a chain straight and run lines back up beside it: out of a side, along a track, into that side', () => {
    const l = layoutGraph(chain);
    const xs = ['a', 'b', 'c', 'd'].map((id) => rectOf(l, id).x);
    expect(new Set(xs).size).toBe(1);
    const boxes = ['a', 'b', 'c', 'd'].map((id) => rectOf(l, id));
    for (const id of ['b-a', 'd-b', 'a-e']) {
      const r = routeOf(l, id);
      expect(r?.points, id).toHaveLength(4);
      expect(r?.fromSide, id).toBe(r?.toSide);
      const track = r?.points[1]?.[0] ?? 0;
      expect(r?.points[2]?.[0], id).toBe(track);
      const outside = boxes.every((b) => track < b.x || track > b.x + b.w);
      expect(outside, id).toBe(true);
    }
  });

  it('share a track where one rail stands above the other, stagger one it passes outside, and keep texts between', () => {
    const l = layoutGraph(chain);
    const track = (id: string) => routeOf(l, id)?.points[1]?.[0] ?? 0;
    const [short, long, past] = [routeOf(l, 'b-a'), routeOf(l, 'd-b'), routeOf(l, 'a-e')];
    if (short?.fromSide === long?.fromSide) expect(track('d-b')).toBe(track('b-a'));
    if (past?.fromSide === long?.fromSide) {
      const out = past?.fromSide === 'left' ? -1 : 1;
      expect(out * (track('a-e') - track('d-b'))).toBeGreaterThan(6 * 'noch einmal'.length);
    }
    const text = l.labels.find((t) => t.text === 'zurück');
    const r = routeOf(l, 'b-a');
    const [y1, y2] = [r?.points[1]?.[1] ?? 0, r?.points[2]?.[1] ?? 0];
    expect(text?.box.y).toBeGreaterThanOrEqual(Math.min(y1, y2) - 1);
    expect((text?.box.y ?? 0) + (text?.box.h ?? 0)).toBeLessThanOrEqual(Math.max(y1, y2) + 1);
  });

  it('put `last` nodes below all others and keep every box and line right of the left margin', () => {
    const l = layoutGraph(chain);
    expect(rectOf(l, 'e').y).toBeGreaterThan(rectOf(l, 'd').y);
    const xs = [...l.routes.flatMap((r) => r.points.map((p) => p[0])), ...l.labels.map((t) => t.box.x)];
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(METRICS.left);
  });

  it('give way to a line through the layers where the ends of a rail stand inside their layers', () => {
    const l = layoutGraph(
      flow({
        nodes: [box('top'), box('l'), box('m'), box('r'), box('x'), box('y'), box('z')],
        edges: [
          rail('top', 'l'),
          rail('top', 'm'),
          rail('top', 'r'),
          rail('l', 'x'),
          rail('m', 'y'),
          rail('r', 'z'),
          rail('y', 'm'),
          rail('y', 'top'),
        ],
        given: { perLayer: Number.POSITIVE_INFINITY },
      }),
    );
    expect(l.routes).toHaveLength(8);
    for (const [id, to] of [
      ['y-m', 'm'],
      ['y-top', 'top'],
    ] as const) {
      const [x, y] = routeOf(l, id)?.points.at(-1) ?? [0, 0];
      const t = rectOf(l, to);
      expect(x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h, id).toBe(true);
    }
  });
});
