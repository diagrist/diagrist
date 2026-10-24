import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, cy, OPPOSITE, right, type Side, segmentHitsRect } from '../geometry.js';
import type { Box } from './boxes.js';

/** Middles of the gaps between columns and between rows. */
export interface Gutters {
  readonly cols: readonly number[];
  readonly rows: readonly number[];
}

/** The gap a Z edge crosses: axis, number, middle and the direction further lanes move to. */
export interface Lane {
  readonly axis: 'col' | 'row';
  readonly index: number;
  readonly at: number;
  readonly dir: 1 | -1;
}

export type Sides =
  | { readonly shape: 'straight' | 'L' | 'loop'; readonly fromSide: Side; readonly toSide: Side }
  | { readonly shape: 'Z'; readonly fromSide: Side; readonly toSide: Side; readonly lane: Lane };

export function sideOf(from: Rect, to: Rect, horizontal: boolean): Side {
  if (horizontal) return cx(to) > cx(from) ? 'right' : 'left';
  return cy(to) > cy(from) ? 'bottom' : 'top';
}

/** A corner strictly inside a box would run through it. */
const strictlyInside = (r: Rect, [x, y]: Point) => x > r.x && x < right(r) && y > r.y && y < bottom(r);

const exitX = (r: Rect, side: Side) => (side === 'right' ? right(r) : r.x);
const exitY = (r: Rect, side: Side) => (side === 'bottom' ? bottom(r) : r.y);

/** The gap between two places; for one place the neighbouring gap, the one behind it, at the edge the one before. */
function laneBetween(axis: Lane['axis'], mids: readonly number[], ia: number, ib: number): Lane | undefined {
  const pick = (index: number, dir: 1 | -1): Lane | undefined => {
    const at = mids[index];
    return at === undefined ? undefined : { axis, index, at, dir };
  };
  if (ia !== ib) return pick(Math.min(ia, ib), ia < ib ? 1 : -1);
  return pick(ia, 1) ?? pick(ia - 1, -1);
}

/** Z over a gap: both ends leave their box towards the gap. */
function zigzag(a: Box, b: Box, lane: Lane): Sides {
  const horizontal = lane.axis === 'col';
  const fromSide = horizontal ? (lane.at > cx(a.rect) ? 'right' : 'left') : lane.at > cy(a.rect) ? 'bottom' : 'top';
  const toSide = horizontal ? (lane.at > cx(b.rect) ? 'right' : 'left') : lane.at > cy(b.rect) ? 'bottom' : 'top';
  return { shape: 'Z', fromSide, toSide, lane };
}

type Blocked = (p1: Point, p2: Point) => boolean;

function zigzagBlocked(a: Box, b: Box, lane: Lane, blocked: Blocked): boolean {
  const s = zigzag(a, b, lane);
  const start: Point =
    lane.axis === 'col' ? [exitX(a.rect, s.fromSide), cy(a.rect)] : [cx(a.rect), exitY(a.rect, s.fromSide)];
  const end: Point =
    lane.axis === 'col' ? [exitX(b.rect, s.toSide), cy(b.rect)] : [cx(b.rect), exitY(b.rect, s.toSide)];
  const c1: Point = lane.axis === 'col' ? [lane.at, start[1]] : [start[0], lane.at];
  const c2: Point = lane.axis === 'col' ? [lane.at, end[1]] : [end[0], lane.at];
  return blocked(start, c1) || blocked(c1, c2) || blocked(c2, end);
}

/** In one row or column: straight, or with something in between as Z over the neighbouring gap. */
function alongAxis(a: Box, b: Box, g: Gutters, horizontal: boolean, blocked: Blocked): Sides {
  const fromSide = sideOf(a.rect, b.rect, horizontal);
  const toSide = OPPOSITE[fromSide];
  const p1: Point = horizontal ? [exitX(a.rect, fromSide), cy(a.rect)] : [cx(a.rect), exitY(a.rect, fromSide)];
  const p2: Point = horizontal ? [exitX(b.rect, toSide), cy(b.rect)] : [cx(b.rect), exitY(b.rect, toSide)];
  const straight = { shape: 'straight', fromSide, toSide } as const;
  if (!blocked(p1, p2)) return straight;
  const lane = horizontal
    ? laneBetween('row', g.rows, a.rowIndex, b.rowIndex)
    : laneBetween('col', g.cols, a.colIndex, b.colIndex);
  return lane ? zigzag(a, b, lane) : straight;
}

/**
 * Shape and sides of an edge in a fixed grid: straight with a free view, else an L (out vertically first, then
 * horizontally first), else a Z over the gap between the columns, else over the gap between the rows.
 */
export function chooseShape(a: Box, b: Box, obstacles: readonly Box[], g: Gutters): Sides {
  if (a.id === b.id) return { shape: 'loop', fromSide: 'right', toSide: 'bottom' };
  const blocked = (p1: Point, p2: Point) =>
    obstacles.some((o) => o.id !== a.id && o.id !== b.id && segmentHitsRect(p1, p2, o.rect, 4));
  if (a.rowIndex === b.rowIndex) return alongAxis(a, b, g, true, blocked);
  if (a.colIndex === b.colIndex) return alongAxis(a, b, g, false, blocked);
  const free = (p: Point) => !strictlyInside(a.rect, p) && !strictlyInside(b.rect, p);

  const vSide = sideOf(a.rect, b.rect, false);
  const hSide = sideOf(b.rect, a.rect, true);
  const corner1: Point = [cx(a.rect), cy(b.rect)];
  const l1ok =
    free(corner1) &&
    !blocked([cx(a.rect), exitY(a.rect, vSide)], corner1) &&
    !blocked(corner1, [exitX(b.rect, hSide), cy(b.rect)]);
  if (l1ok) return { shape: 'L', fromSide: vSide, toSide: hSide };

  const hSide2 = sideOf(a.rect, b.rect, true);
  const vSide2 = sideOf(b.rect, a.rect, false);
  const corner2: Point = [cx(b.rect), cy(a.rect)];
  const l2ok =
    free(corner2) &&
    !blocked([exitX(a.rect, hSide2), cy(a.rect)], corner2) &&
    !blocked(corner2, [cx(b.rect), exitY(b.rect, vSide2)]);
  if (l2ok) return { shape: 'L', fromSide: hSide2, toSide: vSide2 };

  const colLane = laneBetween('col', g.cols, a.colIndex, b.colIndex);
  if (colLane && !zigzagBlocked(a, b, colLane, blocked)) return zigzag(a, b, colLane);
  const rowLane = laneBetween('row', g.rows, a.rowIndex, b.rowIndex);
  if (rowLane) return zigzag(a, b, rowLane);
  if (colLane) return zigzag(a, b, colLane);
  return { shape: 'L', fromSide: hSide2, toSide: vSide2 };
}
