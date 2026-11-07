import { apartOf } from '../label/apart.js';
import { gutterRoom, widen } from '../label/gutters.js';
import type { GridLayout, Route } from '../layout.js';
import { placeGrid } from '../place/index.js';
import { routeEdges } from '../route/index.js';
import type { GridSpec } from '../spec.js';
import type { CellGraph, CellLayout } from './cells.js';
import { better } from './grid-judge.js';
import { marginRound } from './grid-margins.js';
import { outsideRound } from './grid-outside.js';
import { cellLayout, chosenWays, oneByOne, type Round, withWays } from './grid-round.js';
import { signCells } from './grid-signs.js';
import { gridSpecOf } from './grid-spec.js';

/** How often a grid widens its gaps and places again. */
const ROUNDS = 3;

type Cells = CellGraph['given']['cells'];

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

/** One run of a grid: placed, routed, with its routes priced where `price` asks it, and signed. */
const runner =
  (cells: Cells) =>
  (spec: GridSpec, price = false): Round => {
    const grid = placeGrid(spec);
    const routes = routeEdges(spec, grid, price);
    return { spec, grid, routes, signs: signCells(cells, spec, grid, routes) };
  };

/** The texts and signs of a grid, sought again. */
const signer = (cells: Cells) => (spec: GridSpec, grid: GridLayout, routes: readonly Route[]) =>
  signCells(cells, spec, grid, routes);

/**
 * Lays out a layout graph in the author's grid (ADR 0039, amendment of 06.11.2026): places it, routes it through
 * the channel stage and sets its texts and signs. A grid whose tracks or texts do not fit into its gaps widens them
 * as `gutterRoom` asks, sets two lines whose texts stand squeezed between them as far apart as `apartOf` asks, and
 * places again (ADR 0038, D2), at most `ROUNDS` times: for tracks alone, or as long as fewer texts end up without a
 * clear spot than before, or as many and fewer squeezed; the author's grid stays, only its gaps grow. A Z kept inside a
 * frame may then leave it where the frame can grow around it (`outsideRound`), and frames grow around routes on the
 * lanes beyond the grid (`marginRound`). A grid through channels, fixed or adaptive, prices its routes in its first
 * run, before their texts, so the picture with the ways it chose is laid out to the end and stays where it is better
 * than the one without (`better`); else the ways are judged one at a time in the first round (`oneByOne`), and the
 * picture with those that stay is laid out and kept where it is better.
 */
export function layoutCells(graph: CellGraph): CellLayout {
  const spec = gridSpecOf(graph);
  const cells = graph.given.cells;
  const run = runner(cells);
  const first = run(spec);
  const plain = () => laid(cells, run, first);
  if (spec.channels !== true || spec.lines === 'straight') return plain();
  const priced = run(spec, true);
  const ways = chosenWays(priced);
  if (ways.size === 0) return plain();
  const without = plain();
  const all = laid(cells, run, { ...priced, spec: withWays(spec, ways) });
  if (better(spec, without, all)) return all;
  const sign = signer(cells);
  const chosen = oneByOne(cells, first, ways, run, (r) => marginRound(r, run, sign));
  if (chosen === first) return without;
  const some = laid(cells, run, chosen);
  return better(spec, without, some) ? some : without;
}

/** A first round of a grid laid out to the end: its gaps widened, its frames left or grown, its texts set. */
function laid(cells: Cells, run: (spec: GridSpec) => Round, first: Round): CellLayout {
  const apart = (r: Round) => apartOf(r.routes, r.signs.labels, r.spec.metrics, cells.onLine);
  let done = first;
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
  const sign = signer(cells);
  return cellLayout(cells, marginRound(outsideRound(done, run, sign), run, sign));
}
