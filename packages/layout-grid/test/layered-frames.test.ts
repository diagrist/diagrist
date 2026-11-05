import { describe, expect, it } from 'vitest';
import { type LayeredEdge, type LayeredNode, type LayeredSpec, layoutLayered } from '../src/index.js';

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
const box = (id: string, width = 120): LayeredNode => ({ id, width, height: 44 });
const edge = (from: string, to: string, extra: Partial<LayeredEdge> = {}): LayeredEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank: 1,
  ...extra,
});
const frame = (id: string, members: string[]) => ({ id, members, pad: 20, top: 40, head: { width: 80, height: 20 } });
const lay = (spec: Omit<LayeredSpec, 'metrics'>) => layoutLayered({ ...spec, metrics: METRICS });
type Laid = ReturnType<typeof lay>;
const rectOf = (l: Laid, id: string) =>
  l.nodes.find((n) => n.id === id)?.rect ?? l.frames?.find((g) => g.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
const apart = (a: { x: number; w: number }, b: { x: number; w: number }) => a.x + a.w <= b.x || b.x + b.w <= a.x;

describe('frames ordered by the pipeline', () => {
  const nodes = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].map((id) => box(id));
  const frames = [frame('a', ['a1', 'a2']), frame('b', ['b1', 'b2'])];
  const layers = [
    ['a1', 'b1', 'c1'],
    ['b2', 'c2', 'a2'],
  ];

  it('keep the boxes of every frame together and sibling frames apart, in every layer they share', () => {
    const edges = [edge('a1', 'b2'), edge('b1', 'a2'), edge('c1', 'c2'), edge('a1', 'c2')];
    const l = lay({ nodes, edges, layers, reorder: true, frames });
    const [a, b] = [rectOf(l, 'a'), rectOf(l, 'b')];
    expect(apart(a, b)).toBe(true);
    for (const id of ['c1', 'c2']) {
      expect(apart(rectOf(l, id), a)).toBe(true);
      expect(apart(rectOf(l, id), b)).toBe(true);
    }
  });

  it('keep every line inside the picture, also one that has to pass a frame it has no end in', () => {
    const tall = [box('top'), box('mid1'), box('mid2'), box('low'), box('side')];
    const spec = {
      nodes: tall,
      edges: [edge('top', 'low'), edge('mid1', 'mid2'), edge('top', 'mid1'), edge('side', 'mid2')],
      layers: [['top', 'side'], ['mid1'], ['mid2'], ['low']],
      reorder: true,
      frames: [frame('upper', ['top']), frame('middle', ['mid1', 'mid2']), frame('lower', ['low'])],
    };
    const l = lay(spec);
    const xs = [
      ...l.routes.flatMap((r) => r.points.map((p) => p[0])),
      ...(l.frames ?? []).map((f) => f.rect.x),
      ...l.labels.map((t) => t.box.x),
    ];
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(METRICS.left - 20);
    const middle = rectOf(l, 'middle');
    const long = l.routes.find((r) => r.edge === 'top-low')?.points ?? [];
    const inside = long.filter(
      ([x, y]) => x > middle.x && x < middle.x + middle.w && y > middle.y && y < middle.y + middle.h,
    );
    expect(inside).toEqual([]);
  });

  it('let a line beside its layer leave its box outside the lines that go down from it', () => {
    const flat = [box('hub', 240), box('left'), box('far'), box('down')];
    const edges = [edge('hub', 'far', { rank: 0 }), edge('hub', 'down'), edge('left', 'down', { weight: 4 })];
    const l = lay({ nodes: flat, edges, layers: [['far', 'left', 'hub'], ['down']], reorder: false });
    const out = l.routes.find((r) => r.edge === 'hub-far')?.points[0]?.[0] ?? 0;
    const down = l.routes.find((r) => r.edge === 'hub-down')?.points[0]?.[0] ?? 0;
    expect(out).toBeLessThan(down);
  });
});

describe('tracks into one box', () => {
  it('keep two pieces that enter one box apart, so they do not read as one line', () => {
    const nodes = [box('a'), box('b'), box('c'), box('r', 64)];
    const edges = [edge('a', 'r', { bundle: 'j' }), edge('b', 'r', { bundle: 'j' }), edge('c', 'r')];
    const l = lay({ nodes, edges, layers: [['a', 'b', 'c'], ['r']] });
    const level = (id: string) => l.routes.find((r) => r.edge === id)?.points[1]?.[1];
    expect(level('c-r')).not.toBe(level('a-r'));
  });
});

describe('straight lines', () => {
  it('slide a port off the middle so a line runs straight where its two boxes share a stretch', () => {
    const nodes = [box('a', 240), box('d'), box('c'), box('b', 240)];
    const edges = [edge('a', 'c'), edge('a', 'b'), edge('d', 'b')];
    const l = lay({
      nodes,
      edges,
      layers: [
        ['a', 'd'],
        ['c', 'b'],
      ],
    });
    expect(l.routes.find((r) => r.edge === 'a-b')?.points).toHaveLength(2);
  });
});
