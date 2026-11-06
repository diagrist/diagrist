import { describe, expect, it } from 'vitest';
import { type GraphEdge, type GraphNode, linesOfLaid, scoreOf } from '../src/index.js';
import { layWith } from './layered-picture.js';

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
const box = (id: string, width = 120): GraphNode => ({ id, width, height: 44 });
const edge = (from: string, to: string, extra: Partial<GraphEdge> = {}): GraphEdge => ({
  id: `${from}-${to}`,
  from,
  to,
  rank: 'down',
  ...extra,
});
const frame = (id: string, members: string[]) => ({ id, members, pad: 20, top: 40, head: { width: 80, height: 20 } });
const lay = layWith(METRICS);
type Laid = ReturnType<typeof lay>;
const rectOf = (l: Laid, id: string) =>
  l.nodes.find((n) => n.id === id)?.rect ?? l.frames?.find((g) => g.id === id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
const layeredInput = (l: Laid) =>
  linesOfLaid({
    nodes: l.nodes,
    routes: l.routes,
    ends: l.routes.map((r) => r.edge.split('-') as [string, string]),
    labels: [],
    width: l.width,
    height: l.bottom,
  });
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

  it('run a line through a frame that lies wholly between its ends, rather than around it', () => {
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
    const across = long.slice(1).some(([x, y], k) => {
      const [px, py] = long[k] ?? [x, y];
      return (
        px === x && x > middle.x && x < middle.x + middle.w && Math.min(py, y) < middle.y && Math.max(py, y) > middle.y
      );
    });
    expect(across).toBe(true);
    expect(scoreOf(layeredInput(l)).metrics.crossings).toBe(0);
  });

  it('run a line round a frame that lies between its ends where the frame is opaque', () => {
    const nodes = ['top', 'mid1', 'mid2', 'low', 'side'].map((id) => box(id));
    const edges = [edge('top', 'low'), edge('mid1', 'mid2'), edge('top', 'mid1'), edge('side', 'mid2')];
    const frames = [
      frame('upper', ['top']),
      { ...frame('middle', ['mid1', 'mid2']), opaque: true },
      frame('lower', ['low']),
    ];
    const l = lay({ nodes, edges, layers: [['top', 'side'], ['mid1'], ['mid2'], ['low']], reorder: true, frames });
    const middle = rectOf(l, 'middle');
    const long = l.routes.find((r) => r.edge === 'top-low')?.points ?? [];
    const inside = long.slice(1).some(([x, y], k) => {
      const [px, py] = long[k] ?? [x, y];
      return (
        px === x &&
        x > middle.x &&
        x < middle.x + middle.w &&
        Math.min(py, y) < middle.y + middle.h &&
        Math.max(py, y) > middle.y
      );
    });
    expect(inside).toBe(false);
  });

  it('end a line with a frame at an end on the outline of the frame, below a head worn as a tab, its text at the middle between the frames', () => {
    const nodes = [box('s'), box('t1'), box('t2')];
    const frames = [
      { ...frame('up', ['s']), tab: true },
      { ...frame('down', ['t1', 't2']), tab: true },
    ];
    const label = { text: 'importiert', width: 60, size: 10 };
    const edges = [edge('t1', 't2', { rank: 'beside' }), edge('up', 'down', { id: 'imports', label })];
    const l = lay({ nodes, edges, layers: [['s'], ['t1', 't2']], reorder: true, frames });
    const [up, down] = [rectOf(l, 'up'), rectOf(l, 'down')];
    const line = l.routes.find((r) => r.edge === 'imports')?.points ?? [];
    expect(line[0]?.[1]).toBe(up.y + up.h);
    expect(line.at(-1)?.[1]).toBe(down.y + 20);
    const x = line.at(-1)?.[0] ?? 0;
    expect(x).toBeGreaterThan(down.x + 80);
    expect(x).toBeLessThan(Math.min(up.x + up.w, down.x + down.w));
    const text = l.labels[0]?.box ?? { x: 0, y: 0, w: 0, h: 0 };
    expect(line).toHaveLength(2);
    expect(text.x).toBe(x + 6);
    expect(text.y + text.h / 2).toBe((up.y + up.h + down.y) / 2);
  });

  it('keep a line entering a frame from above as far beside its head as the frame asks', () => {
    const passing = (air?: number) => {
      const head = { width: 80, height: 20, ...(air === undefined ? {} : { air }) };
      const frames = [{ ...frame('f', ['b']), head, tab: true }];
      const l = lay({ nodes: [box('a', 40), box('b', 40)], edges: [edge('a', 'b')], frames });
      const x = l.routes.find((r) => r.edge === 'a-b')?.points[0]?.[0] ?? 0;
      return x - rectOf(l, 'f').x - head.width;
    };
    expect(passing()).toBeGreaterThanOrEqual(12);
    expect(passing()).toBeLessThan(40);
    expect(passing(40)).toBeGreaterThanOrEqual(40);
  });

  it('draw a loop beside its box, with room for it before the next box', () => {
    const l = lay({ nodes: [box('a'), box('b')], edges: [edge('a', 'a', { id: 'self' }), edge('a', 'b')] });
    const loop = l.routes.find((r) => r.edge === 'self');
    const a = rectOf(l, 'a');
    expect(loop?.shape).toBe('loop');
    expect(loop?.points.map((p) => p[0])).toEqual([a.x + a.w, a.x + a.w + 32, a.x + a.w + 32, a.x + a.w]);
  });

  it('bend a line beside its layer to the side where it meets no line that goes down from its box', () => {
    const flat = [box('hub', 240), box('left'), box('far'), box('down')];
    const edges = [edge('hub', 'far', { rank: 'beside' }), edge('hub', 'down'), edge('left', 'down', { weight: 4 })];
    const l = lay({ nodes: flat, edges, layers: [['far', 'left', 'hub'], ['down']], reorder: false });
    const beside = l.routes.find((r) => r.edge === 'hub-far')?.points ?? [];
    const hub = l.nodes.find((n) => n.id === 'hub')?.rect.y ?? 0;
    expect(beside[1]?.[1]).toBeLessThan(hub);
    expect(scoreOf(layeredInput(l)).metrics.crossings).toBe(0);
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
