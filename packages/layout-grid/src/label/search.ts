import { DEFAULT_THRESHOLDS, type Point, type Rect } from '@diagrist/core';
import type { Route } from '../layout.js';
import type { GridMetrics } from '../spec.js';
import { type Line, type Place, placeStack, stacks, widthOf } from './blocks.js';
import type { Clear } from './clear.js';
import type { OnLine } from './on-line.js';
import type { EdgeLabel, EdgeText } from './types.js';

/** How far apart the spots along a piece are tried. */
const STEP = 4;
/** A text keeps one pixel more from foreign lines than the line check asks, against rounding. */
const LINE_GAP = DEFAULT_THRESHOLDS.labelClear + 1;

/** How the texts of a channel grid stand: on their line with a pad, or beside it; names on horizontal pieces first. */
export interface SearchOptions {
  readonly preferFlat: boolean;
  readonly onLine?: OnLine;
}

interface Piece {
  readonly a: Point;
  readonly b: Point;
  readonly horizontal: boolean;
  readonly len: number;
}

const piecesOf = (points: readonly Point[], flatFirst: boolean): Piece[] =>
  points
    .slice(1)
    .map((b, i) => {
      const a = points[i] as Point;
      return { a, b, horizontal: a[1] === b[1], len: Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) };
    })
    .sort((p, q) => (flatFirst ? Number(q.horizontal) - Number(p.horizontal) : 0) || q.len - p.len);

/** The rectangles a block of texts takes: their boxes, grown by the pad of texts on a line. */
export const rectsOf = (block: readonly EdgeLabel[], o: SearchOptions): Rect[] =>
  block.map((l) => {
    const pad = o.onLine?.pad;
    const r = l.box;
    return pad ? { x: r.x - pad.x, y: r.y - pad.y, w: r.w + 2 * pad.x, h: r.h + 2 * pad.y } : r;
  });

/** Offsets from the middle of a piece, nearest first, that keep a block `room` long over the piece. */
function offsets(len: number, room: number): number[] {
  const reach = Math.max(0, (len - room) / 2);
  const out = [0];
  for (let d = STEP; d <= reach; d += STEP) out.push(d, -d);
  return out;
}

/** Every way the texts of a route may stand, in the order they are tried. */
function* candidates(
  route: Route,
  i: number,
  text: EdgeText,
  m: GridMetrics,
  o: SearchOptions,
): Generator<EdgeLabel[]> {
  const straight = route.points.length === 2;
  for (const piece of piecesOf(route.points, o.preferFlat)) {
    const places: Place[] = o.onLine
      ? ['on']
      : piece.horizontal
        ? [...(straight && text.name && text.detail ? (['split'] as const) : []), 'above', 'below']
        : text.accent
          ? ['right', 'left']
          : ['left', 'right'];
    for (const lines of stacks(text, !piece.horizontal)) {
      const along = piece.horizontal ? widthOf(lines, m) : lines.length * m.labelLineH;
      for (const d of offsets(piece.len, o.onLine ? along + 2 * STEP : 0)) {
        const t = 0.5 + d / Math.max(1, piece.len);
        const at: Point = [piece.a[0] + (piece.b[0] - piece.a[0]) * t, piece.a[1] + (piece.b[1] - piece.a[1]) * t];
        for (const place of places) yield placeStack(lines as Line[], at, place, i, m);
      }
    }
  }
}

/** What a block of texts on route `i` meets, by `clearOf`: 0 for a clear spot. */
export const blockCost = (block: readonly EdgeLabel[], i: number, clear: Clear, o: SearchOptions): number =>
  rectsOf(block, o).reduce((n, r) => n + clear.cost(r, i, LINE_GAP, o.onLine !== undefined), 0);

/** The block of a route's texts as placed and what it meets; 0 is a clear spot. */
export interface Found {
  readonly block: EdgeLabel[];
  readonly cost: number;
}

/**
 * The texts of route `i` as one block: kept at `first` when that spot is clear, else at the first clear spot beside
 * or on one of its pieces, longest first and nearest the middle, wrapped where that helps; without one, where it
 * meets the least.
 */
export function searchBlock(
  route: Route,
  i: number,
  text: EdgeText,
  first: EdgeLabel[],
  clear: Clear,
  m: GridMetrics,
  o: SearchOptions,
): Found {
  const cost = (block: readonly EdgeLabel[]) => blockCost(block, i, clear, o);
  let best: Found = { block: first, cost: cost(first) };
  if (best.cost === 0) return best;
  for (const block of candidates(route, i, text, m, o)) {
    const c = cost(block);
    if (c < best.cost) best = { block, cost: c };
    if (c === 0) break;
  }
  return best;
}
