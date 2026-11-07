import type { Point } from '@diagrist/core';
import { apartOf } from '../label/apart.js';
import { gutterRoom, widen } from '../label/gutters.js';
import { markAt } from '../label/spots.js';
import type { GridLayout, Route } from '../layout.js';
import { placeGrid } from '../place/index.js';
import { placedOf } from '../placed.js';
import { routeEdges } from '../route/index.js';
import type { GridSpec } from '../spec.js';
import type { CellGraph, CellLayout } from './cells.js';
import { pricedStays } from './grid-judge.js';
import { marginRound } from './grid-margins.js';
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

/** Whether the counts `a` come before `b`, the first count first: fewer texts without a spot, then fewer squeezed. */
const fewer = (a: readonly number[], b: readonly number[]): boolean => {
  const i = a.findIndex((n, k) => n !== b[k]);
  return i >= 0 && (a[i] ?? 0) < (b[i] ?? 0);
};

/** The spec with each edge of `asked` keeping its distance (`GridEdge.apart`) where it asks more; the same spec else. */
function spaced(spec: GridSpec, asked: ReadonlyMap<string, number>): GridSpec {
  const more = (e: GridSpec['edges'][number]) => (asked.get(e.id) ?? 0) > (e.apart ?? 0);
  if (!spec.edges.some(more)) return spec;
  return { ...spec, edges: spec.edges.map((e) => (more(e) ? { ...e, apart: asked.get(e.id) ?? 0 } : e)) };
}

/**
 * Lays out a layout graph in the author's grid (ADR 0039, amendment of 06.11.2026): places it, routes it through
 * the channel stage and sets its texts and signs. A grid whose tracks or texts do not fit into its gaps widens them
 * as `gutterRoom` asks, sets two lines whose texts stand squeezed between them as far apart as `apartOf` asks, and
 * places again (ADR 0038, D2), at most `ROUNDS` times: for tracks alone, or as long as fewer texts end up without a
 * clear spot than before, or as many and fewer squeezed; the author's grid stays, only its gaps grow. A Z kept inside a
 * frame may then leave it where the frame can grow around it (`outsideRound`), and frames grow around routes on the
 * lanes beyond the grid (`marginRound`). A fixed grid through channels is laid
 * out twice, with its routes priced by the measure and without, and the priced one stays where its picture with its
 * texts is better (`pricedStays`).
 */
export function layoutCells(graph: CellGraph): CellLayout {
  const spec = gridSpecOf(graph);
  const priced = laidCells(graph, spec, true);
  if (spec.channels !== true || spec.adaptive || spec.lines === 'straight') return priced;
  const plain = laidCells(graph, spec, false);
  return pricedStays(spec, plain, priced) ? priced : plain;
}

/** A layout graph laid out in the author's grid as `layoutCells` lays it out, its routes priced or not (`priced`). */
function laidCells(graph: CellGraph, given: GridSpec, priced: boolean): CellLayout {
  const cells = graph.given.cells;
  const run = (spec: GridSpec): Round => {
    const grid = placeGrid(spec);
    const routes = routeEdges(spec, grid, priced);
    return { spec, grid, routes, signs: signCells(cells, spec, grid, routes) };
  };
  const apart = (r: Round) => apartOf(r.routes, r.signs.labels, r.spec.metrics, cells.onLine);
  let done = run(given);
  for (let round = 0; round < ROUNDS; round++) {
    const room = gutterRoom(done.spec, done.grid, done.routes, cells.texts, done.signs.crowded);
    const asked = apart(done);
    const wider = spaced(done.spec, asked);
    if (!asks(room) && wider === done.spec) break;
    const next = run(widen(wider, room));
    const before = [done.signs.crowded.length, asked.size];
    const after = [next.signs.crowded.length, apart(next).size];
    if (before.some((n) => n > 0) && !fewer(after, before)) break;
    done = next;
  }
  const sign = (spec: GridSpec, grid: GridLayout, routes: readonly Route[]) => signCells(cells, spec, grid, routes);
  done = marginRound(outsideRound(done, run, sign), run, sign);
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
