import {
  type EdgeText,
  type GridLayout,
  type GridSpec,
  gutterRoom,
  placeGrid,
  type Route,
  routeEdges,
  widen,
} from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';
import type { ArchitectureModel } from '../model/types.js';
import { type Signs, signsOf } from './signs.js';

/** A grid placed, routed and signed, with the spec it was placed from. */
export interface Signed {
  readonly spec: GridSpec;
  readonly grid: GridLayout;
  readonly routes: readonly Route[];
  readonly signs: Signs;
}

/** How often a channel grid widens its gaps and places again. */
const ROUNDS = 3;

const asks = (room: { readonly cols: readonly number[]; readonly rows: readonly number[] }): boolean =>
  [...room.cols, ...room.rows].some((n) => n > 0);

/**
 * Places, routes and signs the grid. A channel grid whose lanes or texts do not fit into its gaps widens them as
 * `gutterRoom` asks and places again (ADR 0038, D2), at most `ROUNDS` times: for lanes alone, or as long as fewer
 * texts end up without a clear spot than before; the author's grid stays, only its gaps grow.
 */
export function placeSigned(model: ArchitectureModel, spec: GridSpec, texts: readonly EdgeText[], look: Look): Signed {
  const run = (s: GridSpec): Signed => {
    const grid = placeGrid(s);
    const routes = routeEdges(s, grid);
    return { spec: s, grid, routes, signs: signsOf(model, s, grid, routes, texts, look) };
  };
  let done = run(spec);
  if (spec.channels !== true) return done;
  for (let round = 0; round < ROUNDS; round++) {
    const room = gutterRoom(done.spec, done.grid, done.routes, texts, done.signs.crowded);
    if (!asks(room)) break;
    const next = run(widen(done.spec, room));
    const before = done.signs.crowded.length;
    if (before > 0 && next.signs.crowded.length >= before) break;
    done = next;
  }
  return done;
}
