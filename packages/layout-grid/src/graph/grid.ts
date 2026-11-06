import type { Point } from '@diagrist/core';
import { gutterRoom, widen } from '../label/gutters.js';
import { markAt } from '../label/spots.js';
import type { GridLayout, Route } from '../layout.js';
import { placeGrid } from '../place/index.js';
import { placedOf } from '../placed.js';
import { routeEdges } from '../route/index.js';
import type { GridSpec } from '../spec.js';
import type { CellGraph, CellLayout } from './cells.js';
import { outsideRound } from './grid-outside.js';
import { type CellSigns, signCells } from './grid-signs.js';
import { gridSpecOf } from './grid-spec.js';

/** How often a grid widens its gaps and places again. */
const ROUNDS = 3;

interface Round {
  readonly spec: GridSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly signs: CellSigns;
}

const asks = (room: { readonly cols: readonly number[]; readonly rows: readonly number[] }): boolean =>
  [...room.cols, ...room.rows].some((n) => n > 0);

/**
 * Lays out a layout graph in the author's grid (ADR 0039, amendment of 06.11.2026): places it, routes it through
 * the channel stage and sets its texts and signs. A grid whose tracks or texts do not fit into its gaps widens them
 * as `gutterRoom` asks and places again (ADR 0038, D2), at most `ROUNDS` times: for tracks alone, or as long as fewer
 * texts end up without a clear spot than before; the author's grid stays, only its gaps grow. A Z kept inside a
 * frame may then leave it where the frame can grow around it (`outsideRound`).
 */
export function layoutCells(graph: CellGraph): CellLayout {
  const cells = graph.given.cells;
  const run = (spec: GridSpec): Round => {
    const grid = placeGrid(spec);
    const routes = routeEdges(spec, grid);
    return { spec, grid, routes, signs: signCells(cells, spec, grid, routes) };
  };
  let done = run(gridSpecOf(graph));
  for (let round = 0; round < ROUNDS; round++) {
    const room = gutterRoom(done.spec, done.grid, done.routes, cells.texts, done.signs.crowded);
    if (!asks(room)) break;
    const next = run(widen(done.spec, room));
    const before = done.signs.crowded.length;
    if (before > 0 && next.signs.crowded.length >= before) break;
    done = next;
  }
  done = outsideRound(done, run, (spec, grid, routes) => signCells(cells, spec, grid, routes));
  const { spec, routes, signs } = done;
  const numbers = cells.signs?.numbers ?? { w: 0, h: 0 };
  const pins = cells.signs?.pins ?? { w: 0, h: 0 };
  const rect = (at: Point, size: { readonly w: number; readonly h: number }) => markAt(at, size.w, size.h);
  return {
    grid: signs.grid,
    routes,
    labels: signs.labels,
    numbers: signs.numbers,
    pins: signs.pins,
    corners: (cells.signs?.corners?.at ?? []).flatMap(({ node }, i) => {
      const at = signs.corners[i];
      return at ? [{ node, x: at[0], y: at[1] }] : [];
    }),
    placed: placedOf(spec, signs.grid, routes, signs.labels, [
      ...signs.numbers.map((n) => ({ route: n.route, rect: rect([n.x, n.y], numbers) })),
      ...signs.pins.map((p) => ({ route: p.route, rect: rect([p.x, p.y], pins), name: 'mark' })),
    ]),
  };
}
