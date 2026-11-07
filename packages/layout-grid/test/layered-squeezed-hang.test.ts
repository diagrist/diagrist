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
  left: 48,
  top: 32,
};
const box = (id: string, width = 120): GraphNode => ({ id, width, height: 48 });
const bar = (id: string): GraphNode => ({ id, width: 96, height: 6, shape: 'bar' });
const edge = (from: string, to: string): GraphEdge => ({ id: `${from}-${to}`, from, to, rank: 'down' });
const part = (id: string, members: string[]) => ({
  id,
  kind: 'part' as const,
  members,
  parent: 'work',
  pad: 24,
  top: 42,
  head: { width: 66, height: 18 },
});

/**
 * A fork into two regions of a frame and a join out of them, the left branch leaving the frame through a point on its
 * border to a wide box beside the join: the straightening sets the frame right of the margin, and the squeeze moves it
 * left with everything in it.
 */
const graph = {
  nodes: [
    box('made'),
    bar('fork'),
    ...['open', 'granted', 'drawn', 'packed', 'sent', 'arrived'].map((id) => box(id)),
    { id: 'abort', width: 16, height: 16, shape: 'ellipse' as const, dock: 'work' },
    bar('join'),
    box('closed'),
    box('cancelled', 184),
    { id: 'end', width: 26, height: 26, shape: 'ellipse' as const },
  ],
  edges: [
    edge('made', 'fork'),
    edge('fork', 'open'),
    edge('fork', 'packed'),
    edge('open', 'granted'),
    edge('packed', 'sent'),
    edge('open', 'abort'),
    edge('granted', 'drawn'),
    edge('sent', 'arrived'),
    edge('abort', 'cancelled'),
    edge('drawn', 'join'),
    edge('arrived', 'join'),
    edge('closed', 'end'),
    edge('cancelled', 'end'),
    edge('join', 'closed'),
  ],
  containers: [
    { id: 'work', kind: 'frame' as const, members: [], pad: 0, top: 30, head: { width: 120, height: 30 } },
    part('shipping', ['packed', 'sent', 'arrived']),
    part('payment', ['open', 'granted', 'drawn']),
  ],
  given: { perLayer: Number.POSITIVE_INFINITY },
  metrics: METRICS,
};

describe('a frame squeezed left', () => {
  const l = layoutGraph(graph);
  const rect = (id: string) => l.nodes.find((n) => n.id === id)?.rect ?? l.frames?.find((f) => f.id === id)?.rect;
  const middle = (id: string) => {
    const r = rect(id);
    return r === undefined ? Number.NaN : r.x + r.w / 2;
  };

  it('stands at the left margin', () => {
    expect(rect('work')?.x).toBe(METRICS.left);
  });

  it('takes the box hanging from the bar above it along, to the middle of the bar', () => {
    expect(middle('made')).toBe(middle('fork'));
  });
});
