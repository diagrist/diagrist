import { describe, expect, it } from 'vitest';
import { type GraphEdge, type GraphNode, layoutGraph } from '../src/index.js';

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
const box = (id: string): GraphNode => ({ id, width: 160, height: 44 });

/** Two lines of one bundle into `i` from `a` and `b`, with `x` and its own line standing between them. */
const lay = (trunk?: 'whole') => {
  const into = (from: string, bundle?: string): GraphEdge => ({
    id: `${from}-i`,
    from,
    to: 'i',
    rank: 'up',
    ...(bundle === undefined ? {} : { bundle, ...(trunk ? { trunk } : {}) }),
  });
  return layoutGraph({
    nodes: ['i', 'a', 'x', 'b'].map(box),
    edges: [into('a', 'g'), into('x'), into('b', 'g')],
    given: { ranks: [['i'], ['a', 'x', 'b']] },
    metrics: METRICS,
  });
};

describe('trunks of a bundle', () => {
  it('gather only ends that stand side by side, so a box between splits them', () => {
    const l = lay();
    expect(l.trunks.get('a-i')).toBeUndefined();
    expect(l.trunks.get('b-i')).toBeUndefined();
  });

  it('keep one trunk and one end at the shared box when the bundle asks for a whole trunk', () => {
    const l = lay('whole');
    expect(l.trunks.get('a-i')).toBeDefined();
    expect(l.trunks.get('a-i')).toBe(l.trunks.get('b-i'));
    const end = (edge: string) => l.routes.find((r) => r.edge === edge)?.points.at(-1);
    expect(end('a-i')).toEqual(end('b-i'));
  });
});

/** A pipeline of four layers under two sources, and a reader `ds` of three of them, as one bundle. */
const readers = () => {
  const down = (from: string, to: string, bundle: string): GraphEdge => ({
    id: `${from}-${to}`,
    from,
    to,
    rank: 'down',
    bundle,
  });
  return layoutGraph({
    nodes: ['crm', 'erp', 'roh', 'ber', 'mod', 'marts', 'ds'].map(box),
    edges: [
      ...[
        ['crm', 'roh'],
        ['erp', 'roh'],
        ['roh', 'ber'],
        ['ber', 'mod'],
        ['mod', 'marts'],
      ].map(([a, b]) => down(a as string, b as string, 'feeds')),
      ...['roh', 'ber', 'mod'].map((to) => ({ ...down('ds', to, 'reads'), strength: 'soft' as const })),
    ],
    metrics: METRICS,
  });
};

describe('fans through the layers', () => {
  it('share one trunk from the middle of their node, each line bending at most twice', () => {
    const l = readers();
    const ds = l.nodes.find((n) => n.id === 'ds')?.rect;
    const route = (to: string) => l.routes.find((r) => r.edge === `ds-${to}`)?.points ?? [];
    const xs = (to: string) =>
      route(to)
        .slice(0, 2)
        .map((p) => p[0]);
    expect(xs('ber')).toEqual(xs('mod'));
    expect(xs('ber')).toEqual([(ds?.x ?? 0) + (ds?.w ?? 0) / 2, (ds?.x ?? 0) + (ds?.w ?? 0) / 2]);
    for (const to of ['roh', 'ber', 'mod']) expect(route(to).length, to).toBeLessThanOrEqual(4);
  });

  it('keep a line of their own each where the trunk would have to enter the core its node stands outside', () => {
    const sized = (id: string, cluster: string, width = 120): GraphNode => ({ id, width, height: 44, cluster });
    const core = ['rampe', 'kontrolle', 'regal', 'versand'];
    const edge = (from: string, to: string, bundle: string): GraphEdge => ({
      id: `${from}-${to}`,
      from,
      to,
      rank: 'down',
      bundle,
    });
    const l = layoutGraph({
      nodes: [
        { ...box('lieferant'), width: 120 },
        { ...box('spedition'), width: 120 },
        ...core.map((id) => sized(id, 'lager', id === 'kontrolle' ? 128 : 120)),
        sized('innen', 'revision'),
        sized('zoll', 'behoerden'),
      ],
      edges: [
        edge('lieferant', 'rampe', 'feeds'),
        edge('spedition', 'rampe', 'feeds'),
        edge('rampe', 'kontrolle', 'feeds|lager'),
        edge('kontrolle', 'regal', 'feeds|lager'),
        edge('regal', 'versand', 'feeds|lager'),
        ...core.map((to) => ({ ...edge('innen', to, 'checks'), strength: 'soft' as const })),
        { ...edge('zoll', 'regal', 'checks|zoll'), strength: 'soft' as const },
      ],
      containers: [{ id: 'lager', kind: 'core', members: core, pad: 16, top: 0, head: { width: 33, height: 11 } }],
      given: { arrangement: 'hub' },
      metrics: METRICS,
    });
    for (const to of core)
      expect(l.routes.find((r) => r.edge === `innen-${to}`)?.points.length, to).toBeLessThanOrEqual(4);
  });
});
