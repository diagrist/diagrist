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
const box = (id: string, width = 160): GraphNode => ({ id, width, height: 44 });
const edge = (from: string, to: string): GraphEdge => ({ id: `${from}-${to}`, from, to, rank: 'down' });
const lay = (nodes: GraphNode[], edges: GraphEdge[]) => layoutGraph({ nodes, edges, metrics: METRICS });

describe('straight lines by moving what stands in their way', () => {
  it('moves the placeholders of a long line under its port, though the line would bend by more than a slip', () => {
    const nodes = ['v', 's', 'o', 'd', 'z', 'w', 'q'].map((id) => box(id));
    const edges = [edge('v', 's'), edge('s', 'z'), edge('v', 'd'), edge('v', 'o'), edge('w', 'q'), edge('q', 'd')];
    const l = lay(nodes, edges);
    const points = l.routes.find((r) => r.edge === 'v-d')?.points ?? [];
    expect(points).toHaveLength(2);
  });
});

describe('the ends on one side of a box', () => {
  it('give way to a straight line where they come along a trunk, so a member of a join runs straight', () => {
    const nodes = ['crm', 'erp', 'ds', 'roh', 'ber', 'mod'].map((id) => box(id, id === 'ds' ? 160 : 240));
    const edges = [
      { ...edge('crm', 'roh'), bundle: 'liefert' },
      { ...edge('erp', 'roh'), bundle: 'liefert' },
      { ...edge('roh', 'ber'), bundle: 'liefert' },
      { ...edge('ber', 'mod'), bundle: 'liefert' },
      { ...edge('ds', 'roh'), bundle: 'liest' },
      { ...edge('ds', 'ber'), bundle: 'liest' },
      { ...edge('ds', 'mod'), bundle: 'liest' },
    ];
    const l = lay(nodes, edges);
    const erp = l.routes.find((r) => r.edge === 'erp-roh')?.points ?? [];
    expect(erp).toHaveLength(2);
  });
});

describe('lines beside a layer', () => {
  it('keep the ends of the boxes below off their verticals, so no two lines lie on one another', () => {
    const nodes = ['patient', 'fall', 'arzt', 'station', 'befund'].map((id) => box(id));
    const edges = [
      { ...edge('patient', 'fall'), rank: 'beside' as const },
      { ...edge('fall', 'arzt'), rank: 'beside' as const },
      { ...edge('arzt', 'station'), rank: 'beside' as const },
      { ...edge('fall', 'station'), rank: 'beside' as const },
      { ...edge('fall', 'befund'), weight: 2 },
      edge('arzt', 'befund'),
    ];
    const l = lay(nodes, edges);
    const verticals = l.routes.flatMap((r) =>
      r.points.slice(1).flatMap((p, i) => {
        const q = r.points[i] as readonly [number, number];
        return p[0] === q[0] ? [{ edge: r.edge, x: p[0], lo: Math.min(p[1], q[1]), hi: Math.max(p[1], q[1]) }] : [];
      }),
    );
    const onOneAnother = verticals.filter((a) =>
      verticals.some((b) => a.edge !== b.edge && a.x === b.x && Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) > 1),
    );
    expect(onOneAnother).toEqual([]);
  });
});

describe('fans and joins pulled off their middle', () => {
  it('bring a merge whose branch comes through placeholders under the middle of its branches, with its column', () => {
    const diamond = (id: string) => ({ ...box(id, 40), sides: ['top', 'bottom', 'left', 'right'] as const });
    const nodes = [box('p'), diamond('d'), box('a'), box('s', 240), box('b', 280), diamond('m'), box('r'), box('t')];
    const edges = [
      edge('p', 'd'),
      { ...edge('d', 'a'), bundle: 'out:d' },
      { ...edge('d', 'b'), bundle: 'out:d' },
      edge('a', 's'),
      { ...edge('s', 'm'), bundle: 'into:m' },
      { ...edge('b', 'm'), bundle: 'into:m' },
      edge('m', 'r'),
      edge('r', 't'),
    ];
    const l = lay(nodes, edges);
    const cx = (id: string) => {
      const r = l.nodes.find((n) => n.id === id)?.rect;
      return r ? r.x + r.w / 2 : Number.NaN;
    };
    expect(cx('m')).toBeCloseTo((cx('s') + cx('b')) / 2, 0);
    for (const id of ['r', 't']) expect(cx(id), id).toBeCloseTo(cx('m'), 0);
  });
});
