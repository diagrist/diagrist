import { checkPlacement, type Point, textWidth } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import {
  type EdgeLabel,
  type GridSpec,
  labelEdges,
  type OnLine,
  placedOf,
  placeGrid,
  type Route,
  routeEdges,
  seatMarks,
} from '../src/index.js';
import { edge, group, METRICS, overlap, spec } from './fixture.js';

const route = (...points: Point[]): Route => ({
  edge: 'e',
  points,
  shape: 'straight',
  fromSide: 'right',
  toSide: 'left',
});
const text = (box: EdgeLabel['box']): EdgeLabel => ({
  text: 'reads',
  x: box.x + box.w / 2,
  y: box.y + box.h,
  anchor: 'middle',
  box,
  route: 0,
  part: 'name',
});
const SIZE = { r: 7.5, room: 6 };
const seated = (r: Route, at: { x: number; y: number }, box: EdgeLabel['box']) =>
  seatMarks([{ route: 0, ...at, n: 1 }], [text(box)], [r], SIZE);

describe('seated marks', () => {
  it('move off the texts on their line to the side facing the start, whichever way the line runs', () => {
    const across = { y: 94, h: 12 };
    const right = seated(route([60, 100], [300, 100]), { x: 180, y: 100 }, { x: 160, w: 40, ...across });
    expect(right.marks).toEqual([{ route: 0, x: 146.5, y: 100, n: 1 }]);
    const left = seated(route([300, 100], [60, 100]), { x: 180, y: 100 }, { x: 160, w: 40, ...across });
    expect(left.marks[0]?.x).toBe(213.5);
    const up = seated(route([100, 300], [100, 60]), { x: 100, y: 180 }, { x: 94, w: 12, y: 160, h: 40 });
    expect(up.marks[0]?.y).toBe(213.5);
    expect(up.labels).toEqual([text({ x: 94, w: 12, y: 160, h: 40 })]);
  });

  it('keep their radius from the start on a line running left, unless they keep the predecessor’s test', () => {
    const line = route([300, 100], [60, 100]);
    const box = { x: 255, y: 94, w: 35, h: 12 };
    const mark = [{ route: 0, x: 272, y: 100, n: 1 }];
    expect(seatMarks(mark, [text(box)], [line], SIZE).marks[0]?.x).toBe(241.5);
    expect(seatMarks(mark, [text(box)], [line], { ...SIZE, predecessor: true }).marks[0]?.x).toBe(303.5);
  });

  it('go next to the start on a short segment and push the texts behind them, and leave marks clear of texts', () => {
    const short = seated(route([60, 100], [120, 100]), { x: 90, y: 100 }, { x: 70, y: 94, w: 40, h: 12 });
    expect(short.marks[0]?.x).toBe(69.5);
    expect(short.labels[0]?.box.x).toBe(83);
    const far = seated(route([60, 100], [300, 100]), { x: 80, y: 100 }, { x: 200, y: 94, w: 40, h: 12 });
    expect(far.marks[0]?.x).toBe(80);
  });
});

function onLine(s: GridSpec, line: OnLine) {
  const layout = placeGrid(s);
  const routes = routeEdges(s, layout);
  return { routes, labels: labelEdges(s, layout, routes, [{ edge: 'x-y', name: 'reads data' }], { onLine: line }) };
}

describe('texts on a line', () => {
  const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], { edges: [edge('x', 'y')] });
  const pad = { x: 4, y: 2 };

  it('slide along their segment by the smallest step that clears what they must avoid', () => {
    const free = onLine(s, { pad, avoid: [] });
    const [name] = free.labels;
    const post = { x: (name?.x ?? 0) - 2, y: 0, w: 4, h: 1000 };
    const slid = onLine(s, { pad, avoid: [post] });
    const box = slid.labels[0]?.box ?? post;
    const grown = { x: box.x - pad.x, y: box.y - pad.y, w: box.w + 2 * pad.x, h: box.h + 2 * pad.y };
    expect(overlap(grown, post)).toBe(false);
    expect(Math.abs((slid.labels[0]?.x ?? 0) - (name?.x ?? 0))).toBe(Math.ceil((box.w / 2 + pad.x + 2) / 2) * 2);
  });

  it('wrap the name where no step clears it, and stay in the middle where wrapping does not help either', () => {
    const free = onLine(s, { pad, avoid: [] });
    const [p1, p2] = free.routes[0]?.points ?? [];
    const length = Math.abs((p2?.[0] ?? 0) - (p1?.[0] ?? 0));
    const mx = free.labels[0]?.x ?? 0;
    const half = textWidth('reads', METRICS.labelFont) / 2 + pad.x + 1;
    const post = (x: number) => ({ x, y: 0, w: 1, h: 1000 });
    const wrapped = onLine(s, { pad, avoid: [post(mx - half - 1), post(mx + half)] });
    expect(wrapped.labels.map((l) => l.text)).toEqual(['reads', 'data']);
    const wall = { x: Math.min(p1?.[0] ?? 0, p2?.[0] ?? 0), y: 0, w: length, h: 1000 };
    expect(onLine(s, { pad, avoid: [wall] }).labels).toEqual(free.labels);
  });

  it('measure the detail line in its own font', () => {
    const detailFont = { size: 14 };
    const t = spec('a b', 'r', ['x@a/r', 'y@b/r'], { edges: [edge('x', 'y')], metrics: { ...METRICS, detailFont } });
    const layout = placeGrid(t);
    const labels = labelEdges(t, layout, routeEdges(t, layout), [{ edge: 'x-y', name: 'reads', detail: 'HTTPS' }]);
    expect(labels.map((l) => l.box.w)).toEqual([textWidth('reads', METRICS.labelFont), textWidth('HTTPS', detailFont)]);
  });
});

describe('numbers on routes', () => {
  const s = spec('a b', 'r', ['x@a/r', 'y@b/r'], { groups: [group('g', ['x'])], edges: [edge('x', 'y')] });
  const layout = placeGrid(s);
  const routes = routeEdges(s, layout);
  const frame = layout.groups[0]?.rect ?? { x: 0, y: 0, w: 0, h: 0 };
  const [start] = routes[0]?.points ?? [];
  const at = (x: number) => ({ route: 0, rect: { x, y: (start?.[1] ?? 0) - 7.5, w: 15, h: 15 } });

  it('belong to the frame of their start when they stand inside it, and are found where they stand on its border', () => {
    const inside = placedOf(s, layout, routes, [], [at(frame.x + frame.w - 20)]);
    expect(inside.at(-1)).toMatchObject({ key: 'x-y.number', kind: 'text', within: 'g' });
    expect(checkPlacement(inside, { width: 2000, height: 1000 })).toEqual([]);
    const border = placedOf(s, layout, routes, [], [at(frame.x + frame.w - 7.5)]);
    expect(border.at(-1)?.within).toBeUndefined();
    expect(checkPlacement(border, { width: 2000, height: 1000 }).map((d) => d.values)).toEqual([
      { case: 'covered', first: 'x-y.number', second: 'g' },
    ]);
  });
});
