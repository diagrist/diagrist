import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, cy, OPPOSITE, right, type Side, segmentHitsRect } from '../geometry.js';
import type { Box } from './boxes.js';

/** Middles of the gaps between columns and between rows. */
export interface Gutters {
  readonly cols: readonly number[];
  readonly rows: readonly number[];
}

/**
 * The gap a Z edge crosses: axis, number, middle and the direction further lanes move to. A lane beyond the first or
 * the last track (`outer`) is no gap: its tracks start at `at` and stack outwards, in `dir`.
 */
export interface Lane {
  readonly axis: 'col' | 'row';
  readonly index: number;
  readonly at: number;
  readonly dir: 1 | -1;
  readonly outer?: true;
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

/** A Z between `a` and `b` over `lane`, with its sides, when none of its three pieces runs through `obstacles`. */
export function freeZigzag(a: Box, b: Box, lane: Lane, obstacles: readonly Box[]): Sides | undefined {
  return zigzagBlocked(a, b, lane, blockedBy(a, b, obstacles)) ? undefined : zigzag(a, b, lane);
}

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
  const straight = { shape: 'straight', fromSide, toSide: OPPOSITE[fromSide] } as const;
  if (!blocked(...ends(a, b, fromSide, horizontal))) return straight;
  const lane = horizontal
    ? laneBetween('row', g.rows, a.rowIndex, b.rowIndex)
    : laneBetween('col', g.cols, a.colIndex, b.colIndex);
  return lane ? zigzag(a, b, lane) : straight;
}

/** The L out of `a` across first (`vertical`) or along first, when its corner and both pieces run through nothing. */
function freeL(a: Box, b: Box, vertical: boolean, blocked: Blocked): Sides | undefined {
  const free = (p: Point) => !strictlyInside(a.rect, p) && !strictlyInside(b.rect, p);
  const fromSide = sideOf(a.rect, b.rect, !vertical);
  const toSide = sideOf(b.rect, a.rect, vertical);
  const corner: Point = vertical ? [cx(a.rect), cy(b.rect)] : [cx(b.rect), cy(a.rect)];
  const start: Point = vertical ? [cx(a.rect), exitY(a.rect, fromSide)] : [exitX(a.rect, fromSide), cy(a.rect)];
  const end: Point = vertical ? [exitX(b.rect, toSide), cy(b.rect)] : [cx(b.rect), exitY(b.rect, toSide)];
  const ok = free(corner) && !blocked(start, corner) && !blocked(corner, end);
  return ok ? { shape: 'L', fromSide, toSide } : undefined;
}

const blockedBy =
  (a: Box, b: Box, obstacles: readonly Box[]): Blocked =>
  (p1, p2) =>
    obstacles.some((o) => o.id !== a.id && o.id !== b.id && segmentHitsRect(p1, p2, o.rect, 4));

/**
 * Every way between two boxes of a fixed grid that runs through none of `obstacles`: straight where they share a row
 * or column, else both Ls, and a Z over each of `lanes`.
 */
export function freeWays(a: Box, b: Box, obstacles: readonly Box[], lanes: readonly Lane[]): Sides[] {
  const blocked = blockedBy(a, b, obstacles);
  const out: Sides[] = [];
  const sameRow = a.rowIndex === b.rowIndex;
  if (sameRow || a.colIndex === b.colIndex) {
    const fromSide = sideOf(a.rect, b.rect, sameRow);
    if (!blocked(...ends(a, b, fromSide, sameRow)))
      out.push({ shape: 'straight', fromSide, toSide: OPPOSITE[fromSide] });
  } else {
    for (const vertical of [true, false]) {
      const l = freeL(a, b, vertical, blocked);
      if (l) out.push(l);
    }
  }
  for (const lane of lanes) if (!zigzagBlocked(a, b, lane, blocked)) out.push(zigzag(a, b, lane));
  return out;
}

/** Where a straight line between two boxes of one row (`horizontal`) or column leaves the first and meets the second. */
function ends(a: Box, b: Box, fromSide: Side, horizontal: boolean): [Point, Point] {
  const toSide = OPPOSITE[fromSide];
  return horizontal
    ? [
        [exitX(a.rect, fromSide), cy(a.rect)],
        [exitX(b.rect, toSide), cy(b.rect)],
      ]
    : [
        [cx(a.rect), exitY(a.rect, fromSide)],
        [cx(b.rect), exitY(b.rect, toSide)],
      ];
}

/**
 * Shape and sides of an edge in a fixed grid: straight with a free view, else an L (out vertically first, then
 * horizontally first), else a Z over the gap between the columns, else over the gap between the rows.
 */
export function chooseShape(a: Box, b: Box, obstacles: readonly Box[], g: Gutters): Sides {
  if (a.id === b.id) return { shape: 'loop', fromSide: 'right', toSide: 'bottom' };
  const blocked = blockedBy(a, b, obstacles);
  if (a.rowIndex === b.rowIndex) return alongAxis(a, b, g, true, blocked);
  if (a.colIndex === b.colIndex) return alongAxis(a, b, g, false, blocked);
  const l = freeL(a, b, true, blocked) ?? freeL(a, b, false, blocked);
  if (l) return l;
  const colLane = laneBetween('col', g.cols, a.colIndex, b.colIndex);
  if (colLane && !zigzagBlocked(a, b, colLane, blocked)) return zigzag(a, b, colLane);
  const rowLane = laneBetween('row', g.rows, a.rowIndex, b.rowIndex);
  if (rowLane) return zigzag(a, b, rowLane);
  if (colLane) return zigzag(a, b, colLane);
  return { shape: 'L', fromSide: sideOf(a.rect, b.rect, true), toSide: sideOf(b.rect, a.rect, false) };
}
