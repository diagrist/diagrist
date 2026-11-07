import type { Point } from '@diagrist/core';
import type { GridLayout, Route } from '../layout.js';
import type { Leaving } from '../route/channel/inside.js';
import type { GridSpec } from '../spec.js';
import type { CellSigns } from './grid-signs.js';
import { grown, type Laid } from './grid-outside.js';

/** Whether a point lies on or beyond a lane outside the grid. */
function beyond(grid: GridLayout, [x, y]: Point): boolean {
  const m = grid.gutters.margins;
  return m !== undefined && (x <= m.cols[0] || x >= m.cols[1] || y <= m.rows[0] || y >= m.rows[1]);
}

/**
 * How far the routes reach past the left and the top of the sheet: left of `marginX`, and above where the highest
 * frame may start, `framePad.top` above the first row.
 */
function reach(spec: GridSpec, routes: readonly Route[]): { left: number; top: number } {
  const m = spec.metrics;
  const points = routes.flatMap((r) => r.points);
  const left = Math.max(0, ...points.map(([x]) => m.marginX - x));
  const top = Math.max(0, ...points.map(([, y]) => m.firstRowY - m.framePad.top - y));
  const up = (n: number) => Math.ceil(n / m.grid) * m.grid;
  return { left: up(left), top: up(top) };
}

/**
 * A grid whose routes run on lanes beyond its first or last track (owner decision D1 of 07.11.2026): where they
 * reach past the left or the top of the sheet, the grid moves right or down by as much and is laid out again; then
 * every frame holding both ends of such a route grows around it and the texts on it (`fitFrames`), the texts are
 * sought again in the grown frames, and the sheet grows to hold the routes. Frames that grew around a route leaving
 * them (`outsideRound`) grow again after the grid moved.
 */
export function marginRound(
  done: Laid,
  run: (spec: GridSpec) => Laid,
  sign: (spec: GridSpec, grid: GridLayout, routes: readonly Route[]) => CellSigns,
): Laid {
  const outer = (r: Laid) =>
    new Set(r.routes.filter((x) => x.points.some((p) => beyond(r.grid, p))).map((x) => x.edge));
  if (outer(done).size === 0) return done;
  const { left, top } = reach(done.spec, done.routes);
  const m = done.spec.metrics;
  const moved =
    left + top > 0
      ? run({ ...done.spec, metrics: { ...m, indent: (m.indent ?? 0) + left, firstRowY: m.firstRowY + top } })
      : done;
  const leaving = moved === done ? [] : moved.spec.edges.filter((e) => (e as Leaving).outside === true);
  const edges = new Set([...outer(moved), ...leaving.map((e) => e.id)]);
  if (edges.size === 0) return moved;
  const signs = sign(moved.spec, grown(moved, edges), moved.routes);
  const grid = grown({ ...moved, signs: { ...signs, grid: moved.signs.grid } }, edges);
  return { ...moved, signs: { ...signs, grid: { ...grid, width: widthOf(moved.signs.grid, grid, moved.routes) } } };
}

/** The right of the columns and frames of a grid, and of `points`. */
const rightOf = (grid: GridLayout, points: readonly Point[]): number =>
  Math.max(
    ...grid.cols.map((c) => c.x + c.w),
    ...grid.groups.map((g) => g.rect.x + g.rect.w),
    ...points.map(([x]) => x),
  );

/** The width of a grid whose frames grew from `was`: as far right of its columns, frames and routes as before. */
function widthOf(was: GridLayout, grid: GridLayout, routes: readonly Route[]): number {
  const keep = was.width - rightOf(was, []);
  return Math.max(
    was.width,
    rightOf(
      grid,
      routes.flatMap((r) => r.points),
    ) + keep,
  );
}
