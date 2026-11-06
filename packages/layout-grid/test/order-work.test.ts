import { describe, expect, it } from 'vitest';
import type { LayeredSpec } from '../src/index.js';
import { jogPrices, orderStarts } from '../src/layered/budget.js';
import { neighboursOf } from '../src/layered/order.js';
import { rankedCost } from '../src/layered/order-cost.js';
import { rank } from '../src/layered/rank.js';
import { orderLayers } from '../src/layers/order.js';
import type { OrderCost } from '../src/layers/sift.js';

/** A dense picture of `n` boxes and `m` edges down the declaration order, the same for the same numbers. */
function dense(n: number, m: number): LayeredSpec {
  let seed = 7;
  const next = () => {
    seed = (seed * 48271) % 2147483647;
    return seed;
  };
  const edges = new Map<string, { id: string; from: string; to: string; rank: 1 }>();
  while (edges.size < m) {
    const a = next() % (n - 1);
    const b = a + 1 + (next() % Math.min(8, n - 1 - a));
    edges.set(`${a}-${b}`, { id: `e${edges.size}`, from: `n${a}`, to: `n${b}`, rank: 1 });
  }
  const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, width: 120, height: 40 }));
  const metrics = {
    colGap: 40,
    rowGapMin: 40,
    track: 12,
    portGap: 16,
    lead: 24,
    tail: 16,
    labelGap: 6,
    left: 0,
    top: 0,
  };
  return { nodes, edges: [...edges.values()], metrics };
}

/** The order of `spec` by the thorough search, with the cost counted, its narrower parts on or off. */
function ordered(spec: LayeredSpec, narrow: boolean, starts = Number.POSITIVE_INFINITY) {
  const ranked = rank(spec);
  const links = neighboursOf(spec, ranked);
  const cost = rankedCost({ ranked, links, cluster: new Map(), pins: new Map(), given: new Map(), dummyWeight: 8 });
  const counts = { whole: 0, narrow: 0 };
  const counted: OrderCost = Object.assign(
    (...args: Parameters<OrderCost>) => {
      counts.whole++;
      return cost(...args);
    },
    narrow
      ? {
          places: (...args: Parameters<NonNullable<OrderCost['places']>>) => {
            counts.narrow++;
            return cost.places?.(...args) ?? [];
          },
          swap: (...args: Parameters<NonNullable<OrderCost['swap']>>) => {
            counts.narrow++;
            return cost.swap?.(...args) ?? 0;
          },
        }
      : {},
  );
  const nodes = [...spec.nodes.map((n) => n.id), ...ranked.dummies];
  return { layers: orderLayers(nodes, ranked.layerOf, links.adj, true, counted, starts), counts };
}

describe('the order search of a layered picture', () => {
  it('prices a node at every place and a swap by their change, choosing as trying every order whole would', () => {
    const spec = dense(14, 24);
    const fast = ordered(spec, true);
    const slow = ordered(spec, false);
    expect(fast.layers).toEqual(slow.layers);
    expect(fast.counts.whole).toBeLessThan(slow.counts.whole / 20);
  });

  it('prices a dense picture of 40 boxes and 80 edges whole only once per sweep of each start', () => {
    const { layers, counts } = ordered(dense(40, 80), true);
    const starts = 2 * (1 + layers.filter((l) => l.length > 1).length);
    expect(counts.whole).toBeLessThanOrEqual(starts * 10);
    expect(counts.narrow).toBeGreaterThan(counts.whole);
  });

  it('tries every start of 40 boxes and 80 edges, but a bounded number of a picture three times as big', () => {
    const small = rank(dense(40, 80));
    const layers = new Set(small.layerOf.values()).size;
    expect(orderStarts(small.layerOf)).toBeGreaterThan(layers);
    const big = rank(dense(120, 288));
    const starts = orderStarts(big.layerOf);
    expect(starts).toBeLessThan(new Set(big.layerOf.values()).size);
    expect(ordered(dense(120, 288), true, starts).counts.whole).toBeLessThanOrEqual(2 * starts * 10);
  });

  it('lets a picture of 40 boxes price twenty drawings that straighten lines, and a huge one none', () => {
    expect(jogPrices(140)).toBeGreaterThan(10);
    expect(jogPrices(600)).toBe(0);
  });
});
