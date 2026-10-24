import { isKnown } from '../../diagram.js';
import type { UseCaseModel } from '../../model.js';
import { acrossPlan } from './across.js';
import { type AutoGrid, toGrid } from './grid.js';
import { bandOrder } from './order.js';
import { depths, type Parts, type Side } from './parts.js';
import { acrossSides, bandIndex, bridged, stackedPlan } from './plan.js';
import { insertRow, type Slot } from './rows.js';
import { flipFamilies } from './search.js';
import { sides } from './sides.js';
import { type Solved, solve } from './solve.js';

/** At most this many subjects side by side; below each other from this many rows the picture is too tall. */
const MAX_ACROSS = 3;
const TALL = 10;

/** Below each other: sides by the column of the use cases; when lines cross, families of actors change sides. */
function stacked(p: Parts, bandOf: (id: string) => number, subjects: number): Solved {
  const side = sides(p, depths(p));
  const run = (s: Map<string, Side>) => solve(p, bandOf, stackedPlan(p, s), subjects);
  const best = run(side);
  return best.bad > 0 ? flipFamilies(p, side, best, run) : best;
}

/** Side by side: shared actors between the subjects, the others left or right of their subject. */
function across(p: Parts, bandOf: (id: string) => number, subjects: number): Solved {
  const { side, home, fixed } = acrossSides(p, bandOf);
  const run = (s: Map<string, Side>) => solve(p, bandOf, acrossPlan(p, bandOf, s, home), subjects);
  const best = run(side);
  return best.bad > 0 ? flipFamilies(p, side, best, run, fixed) : best;
}

/**
 * More than three subjects: a grid of rows and columns, at most three per row. Columns behave as side by side
 * (lanes for actors between them), rows as below each other (bands with a gap).
 */
function gridded(p: Parts, declared: (id: string) => number, subjects: number): Solved {
  const perRow = Math.ceil(subjects / Math.ceil(subjects / MAX_ACROSS));
  const bandOf = bandOrder(p, declared, subjects, perRow);
  const grid = { row: (id: string) => Math.floor(bandOf(id) / perRow), column: (id: string) => bandOf(id) % perRow };
  const { side, home, fixed } = acrossSides(p, grid.column);
  const run = (s: Map<string, Side>) => solve(p, bandOf, { ...acrossPlan(p, grid.column, s, home), grid }, subjects);
  const best = run(side);
  return best.bad > 0 ? flipFamilies(p, side, best, run, fixed) : best;
}

const height = (s: Solved) => Math.max(...s.pos.values()) - Math.min(...s.pos.values()) + 1;

/**
 * Several subjects: `direction` decides. Without it they stand below each other, unless an actor takes part in more
 * than one or the picture would grow too tall; then side by side, more than three in a grid, if that crosses no
 * more than below each other.
 */
function choose(m: UseCaseModel, p: Parts): Solved {
  const declared = bandIndex(m);
  const n = m.diagram.subjects.length;
  const direction = m.diagram.direction;
  if (n < 2 || direction === 'down') return stacked(p, declared, n);
  const bandOf = bandOrder(p, declared, n, n);
  if (direction === 'right') return across(p, bandOf, n);
  const down = stacked(p, declared, n);
  if (!bridged(p, declared) && height(down) <= TALL) return down;
  const right = n > MAX_ACROSS ? gridded(p, declared, n) : across(p, bandOf, n);
  return right.bad <= down.bad ? right : down;
}

/**
 * The automatic grid of a use case diagram: actors left and right outside, use cases in columns by include, extend
 * and generalization depth, rows by the mean of their neighbours (barycentre), actors at the middle height of their
 * use cases. Every `slot` then inserts an empty row for a note without changing the order.
 */
export function useCaseGrid(m: UseCaseModel, slots: readonly Slot[] = []): AutoGrid {
  const p: Parts = { actors: m.diagram.actors, cases: m.diagram.cases, relations: m.diagram.relations.filter(isKnown) };
  const best = choose(m, p);
  const isActor = (s: Slot) => best.side.has(s.near);
  const same = best.plan.grid?.column ?? bandIndex(m);
  const scope = (s: Slot) =>
    best.plan.across ? (id: string) => !best.side.has(id) && same(id) === same(s.near) : undefined;
  const freed = slots.filter((x) => !isActor(x)).map((s) => insertRow(best.pos, s, scope(s)));
  if (slots.some((x) => !isActor(x))) best.placeActors();
  freed.push(...slots.filter(isActor).map((s) => insertRow(best.pos, s)));
  return toGrid(p, best.pos, best.plan, Math.min(...freed));
}
