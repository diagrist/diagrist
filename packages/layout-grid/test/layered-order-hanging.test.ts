import { describe, expect, it } from 'vitest';
import { type GraphEdge, type GraphNode, layoutGraph } from '../src/index.js';
import { neighboursOf } from '../src/layered/order.js';
import { hangingOrder } from '../src/layered/order-hanging.js';
import { rank } from '../src/layered/rank.js';
import type { LayeredSpec } from '../src/layered/spec.js';

const METRICS = {
  colGap: 72,
  rowGapMin: 56,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 6,
  left: 32,
  top: 32,
};
const box = (id: string): GraphNode => ({ id, width: 160, height: 44 });
const FIRST = ['a', 'b', 'c', 'd', 'e'];
const HANGING = ['x', 'y', 'z'];

/** Eight boxes on one whole trunk into `top`, five in the first row and three hanging in a second row below. */
const into = (from: string): GraphEdge => ({
  id: `${from}-top`,
  from,
  to: 'top',
  rank: 'up',
  bundle: 'g',
  trunk: 'whole',
});

describe('the order of a hanging row', () => {
  it('puts the placeholders of a row held by them alone into gaps of their own, the boxes kept in their order', () => {
    const spec: LayeredSpec = {
      nodes: ['top', ...FIRST, ...HANGING].map(box),
      edges: [...FIRST, ...HANGING].map((n) => ({ id: `top-${n}`, from: 'top', to: n, rank: 1 as const })),
      metrics: METRICS,
    };
    const fixed = new Map([['top', 0], ...FIRST.map((n) => [n, 1] as const), ...HANGING.map((n) => [n, 2] as const)]);
    const ranked = rank(spec, fixed);
    const links = neighboursOf(spec, ranked);
    const held = HANGING.map((n) => ranked.chains.get(`top-${n}`)?.[1] as string);
    const width = (n: string) => (ranked.dummies.has(n) ? 0 : 160);
    const order = hangingOrder({ ranked, links, width, gap: 72 }, [['top'], [...FIRST, ...held], HANGING]);
    expect(order?.[1]).toEqual(['a', 'b', held[0], 'c', held[1], 'd', held[2], 'e']);
    expect(order?.[2]).toEqual(HANGING);
  });

  it('leaves an order alone whose placeholders already stand in gaps of their own', () => {
    const spec: LayeredSpec = {
      nodes: ['top', 'a', 'b', 'x'].map(box),
      edges: ['a', 'b', 'x'].map((n) => ({ id: `top-${n}`, from: 'top', to: n, rank: 1 as const })),
      metrics: METRICS,
    };
    const ranked = rank(
      spec,
      new Map([
        ['top', 0],
        ['a', 1],
        ['b', 1],
        ['x', 2],
      ]),
    );
    const d = ranked.chains.get('top-x')?.[1] as string;
    const s = { ranked, links: neighboursOf(spec, ranked), width: () => 160, gap: 72 };
    expect(hangingOrder(s, [['top'], ['a', d, 'b'], ['x']])).toBeUndefined();
  });

  it('draws the hanging row straight below a first row in the declared order, the shared box over its middle', () => {
    const l = layoutGraph({
      nodes: ['top', ...FIRST, ...HANGING].map(box),
      edges: [...FIRST, ...HANGING].map(into),
      given: { ranks: [['top'], FIRST, HANGING] },
      metrics: METRICS,
    });
    const at = (id: string) => l.nodes.find((n) => n.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
    const xs = FIRST.map((n) => at(n).x);
    expect([...xs].sort((p, q) => p - q)).toEqual(xs);
    const mid = (r: { x: number; w: number }) => r.x + r.w / 2;
    expect(mid(at('top'))).toBe(mid(at('c')));
    for (const n of HANGING) {
      const route = l.routes.find((r) => r.edge === `${n}-top`)?.points ?? [];
      expect(route.length - 2, n).toBeLessThanOrEqual(2);
    }
  });
});
