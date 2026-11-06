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
