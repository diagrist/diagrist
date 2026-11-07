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

describe('the sides, tracks and texts of rails', () => {
  it('take the side free of a rail still to come whose side is settled, where both would cross', () => {
    const loop: GraphEdge = { id: 'b-b', from: 'b', to: 'b', rank: 'down', profile: 'loop' };
    const l = layoutGraph(
      flow({
        nodes: ['a', 'b', 'c', 'd', 'e'].map((id) => box(id)),
        edges: [rail('a', 'b'), rail('b', 'c'), rail('c', 'd'), rail('d', 'e'), loop, rail('c', 'a'), rail('e', 'b')],
        given: { perLayer: Number.POSITIVE_INFINITY },
      }),
    );
    expect(routeOf(l, 'e-b')?.fromSide).toBe('left');
    expect(routeOf(l, 'c-a')?.fromSide).toBe('right');
  });

  it('share a track where their stretches meet only in a box, though the text of one stands on an end piece', () => {
    const l = layoutGraph(
      flow({
        nodes: [box('t'), box('u', 360), box('a'), box('b', 360), box('c')],
        edges: [
          rail('t', 'u'),
          rail('u', 'a'),
          rail('a', 'b'),
          rail('b', 'c'),
          rail('a', 't'),
          rail('a', 'c', 'weiter'),
        ],
        given: { perLayer: Number.POSITIVE_INFINITY },
      }),
    );
    const [back, on] = [routeOf(l, 'a-t'), routeOf(l, 'a-c')];
    expect(back?.fromSide).toBe(on?.fromSide);
    expect(back?.points[1]?.[0]).toBe(on?.points[1]?.[0]);
  });

  it('set a text on the piece out of a box whose own texts reach beside it, clear of the box, not of its reach', () => {
    const wide = { ...box('b'), reach: { left: 160, right: 160 } };
    const l = layoutGraph(
      flow({
        nodes: [box('top', 360), box('a'), wide],
        edges: [rail('top', 'a'), rail('a', 'b'), rail('b', 'top', 'zurück')],
        given: { perLayer: Number.POSITIVE_INFINITY },
      }),
    );
    const [x0, y0] = routeOf(l, 'b-top')?.points[0] ?? [0, 0];
    const at = l.labels.find((t) => t.text === 'zurück')?.box ?? { x: 0, y: 0, w: 0, h: 0 };
    expect(at.y).toBeGreaterThan(y0);
    expect(at.y - y0).toBeLessThanOrEqual(METRICS.labelGap);
    expect(Math.abs(at.x - x0) <= METRICS.labelGap || Math.abs(at.x + at.w - x0) <= METRICS.labelGap).toBe(true);
  });

  it('pass beyond the texts of other lines where they stand, not where they might, on the side free of them', () => {
    const long: GraphEdge = {
      id: 'a-b',
      from: 'a',
      to: 'b',
      rank: 'down',
      label: label('a text right of its line, long enough'),
    };
    const l = layoutGraph(
      flow({
        nodes: [box('a'), box('b'), box('c')],
        edges: [long, rail('b', 'c'), rail('c', 'a')],
        given: { perLayer: Number.POSITIVE_INFINITY },
      }),
    );
    const back = routeOf(l, 'c-a');
    const a = rectOf(l, 'a');
    const text = l.labels.find((t) => t.text.startsWith('a text'))?.box ?? { x: 0, y: 0, w: 0, h: 0 };
    const left = back?.fromSide === 'left';
    expect(left ? text.x > a.x : text.x + text.w < a.x + a.w).toBe(true);
    expect(back?.points[1]?.[0]).toBe(left ? a.x - METRICS.lead : a.x + a.w + METRICS.lead);
  });
});
