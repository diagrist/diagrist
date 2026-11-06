import { isKnown } from '../../diagram.js';
import type { UseCaseModel } from '../../model.js';
import { type Laid, laidUseCase } from '../laid.js';
import { acrossPlan } from './across.js';
import { flipFamilies, type Priced } from './flip.js';
import { bandOrders } from './order.js';
import { depths, type Parts, type Side } from './parts.js';
import { acrossSides, bandIndex, bridged, type Plan, stackedPlan } from './plan.js';
import { sides } from './sides.js';

/** At most this many subjects side by side; below each other from this many rows the picture is too tall. */
const MAX_ACROSS = 3;
const TALL = 10;
/** Empty rows between two subjects below each other, for the foot and head of their frames. */
const BAND_GAP = 2;
/** At most this many sets of columns are tried side by side. */
const COLUMN_SETS = 6;
/**
 * Of two sets of columns with as many lines through boxes, across others or past foreign subjects, another than the
 * declared one wins only where it costs this much less, the price of a bend, 200 px of line: not for a few pixels.
 */
const SWITCH = 20;

/**
 * What a laid out picture costs by the measure of the line check, whether it is clean, and how many crossings and
 * findings of the check it has.
 */
export type Price = (laid: Laid) => { readonly cost: number; readonly clean: boolean; readonly bad: number };

/** A plan laid out and priced. */
type Tried = Priced & { readonly laid: Laid; readonly bad: number };

/**
 * Rows below each other: per subject the use cases of its fullest column, a gap of two rows between subjects. An
 * estimate of the height, read before any layout.
 */
function rowsDown(p: Parts, band: (id: string) => number): number {
  const bands = [...new Set(p.cases.map((c) => band(c.id)))];
  const depth = depths(p);
  const rows = bands.map((b) => {
    const own = p.cases.filter((c) => band(c.id) === b);
    return Math.max(
      ...[...new Set(own.map((c) => depth.get(c.id)))].map((d) => own.filter((c) => depth.get(c.id) === d).length),
    );
  });
  const actors = Math.max(...(['left', 'right'] as const).map((s) => p.actors.filter((a) => a.side === s).length), 0);
  return Math.max(rows.reduce((s, r) => s + r, 0) + BAND_GAP * (rows.length - 1), Math.ceil(actors * 1.5));
}

/**
 * The layout of a use case diagram (layout plan P11): a plan of columns, laid out by the layout graph, which orders
 * every column. Several subjects stand below each other, unless an actor takes part in more than one or the picture
 * would grow too tall; then side by side, more than three in columns whose subjects the order stacks, or as
 * `direction` says otherwise. Side by side, every set of columns of the order stage is laid out, since which
 * subjects share a column only the layout shows, and while one is not clean its families of actors try the other
 * side; the declared set first, another wins by fewer lines through boxes, crossings and lines past a foreign subject,
 * or on as many where it is cheaper by `SWITCH`, so shorter lines and a smaller picture choose the order of the
 * subjects. Below each other is tried only where side by side is not clean of these, and wins where it has fewer. Notes
 * take free spots; where one finds none near its anchor, the picture is laid out once more with room for it beside its
 * anchor, and the cheaper stays, a note on a box or text costing as much as a line through a box, one on a line or
 * frame line as a text on a line.
 */
export function arrangeUseCase(m: UseCaseModel, price: Price): Laid {
  const p: Parts = { actors: m.diagram.actors, cases: m.diagram.cases, relations: m.diagram.relations.filter(isKnown) };
  const tried = (plan: Plan): Tried => {
    const free = laidUseCase(m, plan);
    const first: Tried = { laid: free, side: plan.side, ...price(free) };
    if (free.crowded.length === 0) return first;
    const held = laidUseCase(m, plan, new Set(free.crowded.map((c) => c.id)));
    const second: Tried = { laid: held, side: plan.side, ...price(held) };
    return second.cost < first.cost ? second : first;
  };
  const declared = bandIndex(m);
  const n = m.diagram.subjects.length;
  const stacked = (): Tried => {
    const run = (s: Map<string, Side>) => tried(stackedPlan(p, s));
    return flipFamilies(p, run(sides(p, depths(p))), run);
  };
  const across = (column: (id: string) => number) => {
    const { side, home, fixed } = acrossSides(p, column);
    const run = (s: Map<string, Side>) => tried(acrossPlan(p, column, s, home));
    return { first: run(side), run, fixed };
  };
  const flipped = (c: ReturnType<typeof across>) => flipFamilies(p, c.first, c.run, c.fixed);
  const side = (): Tried => {
    const perRow = n <= MAX_ACROSS ? n : Math.ceil(n / Math.ceil(n / MAX_ACROSS));
    const [own, ...others] = bandOrders(p, declared, n, perRow, COLUMN_SETS).map((bandOf) =>
      n <= MAX_ACROSS ? bandOf : (id: string) => bandOf(id) % perRow,
    );
    const [first, ...rest] = [own ?? declared, ...others].map(across);
    let best = flipped(first ?? across(declared));
    rest.sort((a, b) => a.first.bad - b.first.bad || a.first.cost - b.first.cost);
    for (const c of rest) {
      if (best.clean && c.first.bad > 1) continue;
      const got = flipped(c);
      if (got.bad < best.bad || (got.bad === best.bad && got.cost < best.cost - SWITCH)) best = got;
    }
    return best;
  };
  if (n < 2 || m.diagram.direction === 'down') return stacked().laid;
  if (m.diagram.direction === 'right') return side().laid;
  if (!bridged(p, declared) && rowsDown(p, declared) <= TALL) return stacked().laid;
  const right = side();
  if (right.bad === 0) return right.laid;
  const down = stacked();
  return right.bad <= down.bad ? right.laid : down.laid;
}
