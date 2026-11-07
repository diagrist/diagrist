import type { GridLayout, Route } from '../layout.js';
import { type Piece, piecesOf } from './gutter-text.js';

/** A gap between two columns or rows: where it starts and ends across, its number and axis. */
export interface Gap {
  readonly axis: 'col' | 'row';
  readonly index: number;
  readonly lo: number;
  readonly hi: number;
}

const gapsOf = (axis: Gap['axis'], spans: readonly (readonly [number, number])[]): Gap[] =>
  spans.slice(1).map(([at], index) => {
    const [x, size] = spans[index] as readonly [number, number];
    return { axis, index, lo: x + size, hi: at };
  });

/** The gaps between the columns of a grid and between its rows. */
export const gapsIn = (layout: GridLayout): Gap[] => [
  ...gapsOf(
    'col',
    layout.cols.map((c) => [c.x, c.w]),
  ),
  ...gapsOf(
    'row',
    layout.rows.map((r) => [r.y, r.h]),
  ),
];

/**
 * Where the tracks of a gap's row lie, as the channel stage laid them (`Route.tracks`), wherever they stand: a row of
 * many tracks spreads beyond a narrow gap, into the boxes beside it. A track counts while its route still runs along
 * it, across the gap.
 */
export function rowOf(g: Gap, routes: readonly Route[], pieces: readonly Piece[][]): number[] {
  const along = (p: Piece, x: number) =>
    p.upright === (g.axis === 'col') && Math.abs(p.a[g.axis === 'col' ? 0 : 1] - x) < 0.5;
  const row = routes.flatMap((r, i) =>
    (r.tracks ?? [])
      .filter((t) => t.axis === g.axis && t.gap === g.index && (pieces[i] ?? []).some((p) => along(p, t.at)))
      .map((t) => t.at),
  );
  return [...new Set(row)];
}

/**
 * Whether the row of tracks of a gap stands beyond the gap, into the boxes beside it (ADR 0038, D2): then the gap
 * grows as `gutterRoom` asks, whatever that does to the texts.
 */
export function leavesGap(layout: GridLayout, routes: readonly Route[]): boolean {
  const pieces = routes.map((r) => piecesOf(r.points));
  return gapsIn(layout).some((g) => rowOf(g, routes, pieces).some((x) => x < g.lo || x > g.hi));
}
