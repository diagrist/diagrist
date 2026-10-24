import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, cy, type GridLayout, right, type Side } from '@diagrist/layout-grid';
import type { StateModel } from '../model.js';
import { type EndBox, foreignFrames } from './ends.js';
import { borderOf, borderSide, hostOf, inFrame, segmentHits } from './points/geometry.js';

const FLIP: Readonly<Record<Side, Side>> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
const BARS = new Set(['state', 'fork', 'join']);

/** Do the boxes overlap across the flow? Then the way goes straight on. */
const aligned = (a: Rect, b: Rect, down: boolean) =>
  down ? a.x < right(b) && b.x < right(a) : a.y < bottom(b) && b.y < bottom(a);

/** Does a foreign node lie between both along the flow? Then the edge takes a rail. */
function skips(a: EndBox, b: EndBox, grid: GridLayout, down: boolean): boolean {
  const lo = down ? bottom(a.rect) : right(a.rect);
  const hi = down ? b.rect.y : b.rect.x;
  const from = Math.min(down ? a.rect.x : a.rect.y, down ? b.rect.x : b.rect.y);
  const to = Math.max(down ? right(a.rect) : bottom(a.rect), down ? right(b.rect) : bottom(b.rect));
  return grid.nodes.some((n) => {
    if (n.id === a.id || n.id === b.id) return false;
    const [s, e] = down ? [n.rect.y, bottom(n.rect)] : [n.rect.x, right(n.rect)];
    const [cs, ce] = down ? [n.rect.x, right(n.rect)] : [n.rect.y, bottom(n.rect)];
    return s >= lo && e <= hi && cs < to && ce > from;
  });
}

/** How many foreign nodes and frames a rail on this side (-1 left or top, +1 right or bottom) would meet. */
function blockers(m: StateModel, a: EndBox, b: EndBox, grid: GridLayout, down: boolean, dir: -1 | 1): number {
  const at =
    dir < 0
      ? Math.min(down ? a.rect.x : a.rect.y, down ? b.rect.x : b.rect.y) - 16
      : Math.max(down ? right(a.rect) : bottom(a.rect), down ? right(b.rect) : bottom(b.rect)) + 16;
  const [from, to] = down ? [cy(a.rect), cy(b.rect)] : [cx(a.rect), cx(b.rect)];
  const p: Point = down ? [at, from] : [from, at];
  const q: Point = down ? [at, to] : [to, at];
  const rects = [
    ...grid.nodes.filter((n) => n.id !== a.id && n.id !== b.id).map((n) => n.rect),
    ...foreignFrames(m, a.id, b.id, grid),
  ];
  return rects.filter((r) => segmentHits(p, q, r, 2)).length;
}

/** Is the corner from the middle of the source along the flow to beside the target free of foreign nodes? */
function cornerFree(a: EndBox, b: EndBox, grid: GridLayout, down: boolean): boolean {
  const p: Point = down ? [cx(a.rect), bottom(a.rect)] : [right(a.rect), cy(a.rect)];
  const q: Point = down ? [p[0], cy(b.rect)] : [cx(b.rect), p[1]];
  const t: Point = [cx(b.rect), cy(b.rect)];
  const rects = grid.nodes.filter((n) => n.id !== a.id && n.id !== b.id).map((n) => n.rect);
  return !rects.some((r) => segmentHits(p, q, r, 8) || segmentHits(q, t, r, 8));
}

/** Entry and exit points: outward on their side of the border, inward on the opposite one. */
function pointSide(m: StateModel, box: EndBox, other: EndBox, grid: GridLayout): Side | undefined {
  if (!borderOf(m, box.id) && !hostOf(m, box.id)) return undefined;
  const side = borderSide(m, box.id, grid);
  if (!side) return undefined;
  const border = borderOf(m, box.id);
  return border && inFrame(m, other.id, border) ? FLIP[side] : side;
}

/**
 * Sides of a transition in `mode` (0 by position, 1 and 2 the two rails). Forward it leaves and enters along the
 * flow; back edges run on an outer rail beside both states and dock at their sides, as on the learning platform. A
 * small pseudostate lying aside is reached over its corner, and points dock on their side of the border.
 */
export function transitionSides(
  m: StateModel,
  a: EndBox,
  b: EndBox,
  mode: number,
  index: number,
  grid: GridLayout,
): [Side, Side] {
  const [from, to] = baseSides(m, a, b, mode, index, grid);
  return [pointSide(m, a, b, grid) ?? from, pointSide(m, b, a, grid) ?? to];
}

const isPoint = (m: StateModel, id: string, frame: boolean) => !frame && !BARS.has(m.kind(id) ?? 'state');

function baseSides(
  m: StateModel,
  boxA: EndBox,
  boxB: EndBox,
  mode: number,
  index: number,
  grid: GridLayout,
): [Side, Side] {
  const [a, b] = [boxA.rect, boxB.rect];
  const down = m.diagram.direction === 'down';
  const [lo, hi, before, after]: [Side, Side, Side, Side] = down
    ? ['left', 'right', 'top', 'bottom']
    : ['top', 'bottom', 'left', 'right'];
  const centre = (r: Rect) => (down ? cx(r) : cy(r));
  const start = (r: Rect) => (down ? r.x : r.y);
  const end = (r: Rect) => (down ? right(r) : bottom(r));
  const ahead = down ? b.y >= bottom(a) : b.x >= right(a);
  const behind = down ? a.y >= bottom(b) : a.x >= right(b);
  if (!ahead && !behind) return centre(a) < centre(b) ? [hi, lo] : [lo, hi];
  const [freeLo, freeHi] = [blockers(m, boxA, boxB, grid, down, -1), blockers(m, boxA, boxB, grid, down, 1)];
  const byPlace: Side = Math.abs(centre(a) - centre(b)) < 1 ? (index % 2 ? lo : hi) : centre(a) > centre(b) ? hi : lo;
  const rail: Side = mode === 1 ? hi : mode === 2 ? lo : freeLo !== freeHi ? (freeLo < freeHi ? lo : hi) : byPlace;
  const toward = (f: Rect, o: Rect): Side | undefined =>
    end(o) <= start(f) ? lo : start(o) >= end(f) ? hi : undefined;
  const corner = ahead && isPoint(m, boxB.id, boxB.frame) ? toward(b, a) : undefined;
  if (corner && cornerFree(boxA, boxB, grid, down)) return [after, corner];
  if (behind || skips(boxA, boxB, grid, down)) return [rail, rail];
  if (aligned(a, b, down)) return [after, before];
  const out = isPoint(m, boxA.id, boxA.frame) ? toward(a, b) : undefined;
  const into = isPoint(m, boxB.id, boxB.frame) ? toward(b, a) : undefined;
  if (out || into) return [out ?? after, into ?? before];
  return mode === 0 ? [after, before] : [rail, rail];
}
