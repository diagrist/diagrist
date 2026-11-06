import { isKnown } from '../../diagram.js';
import type { UseCaseModel } from '../../model.js';
import { type Laid, laidUseCase } from '../laid.js';
import { acrossPlan } from './across.js';
import { flipFamilies, type Priced } from './flip.js';
import { bandOrder } from './order.js';
import { depths, type Parts, type Side } from './parts.js';
import { acrossSides, bandIndex, bridged, type Plan, stackedPlan } from './plan.js';
import { sides } from './sides.js';

/** At most this many subjects side by side; below each other from this many rows the picture is too tall. */
const MAX_ACROSS = 3;
const TALL = 10;
/** Empty rows between two subjects below each other, for the foot and head of their frames. */
const BAND_GAP = 2;

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
 * would grow too tall; then side by side, more than three in columns whose subjects the order stacks, where that
 * runs through, crosses and passes foreign subjects no more often, or as
 * `direction` says otherwise. While a picture is not clean, families of actors try the other side. Notes take free
 * spots; where one finds none, the picture is laid out once more with room for it beside its anchor, and the cheaper
 * stays, a note on a box or text costing as much as a line through a box.
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
  const across = (column: (id: string) => number): Tried => {
    const { side, home, fixed } = acrossSides(p, column);
    const run = (s: Map<string, Side>) => tried(acrossPlan(p, column, s, home));
    return flipFamilies(p, run(side), run, fixed);
  };
  const side = (): Tried => {
    if (n <= MAX_ACROSS) return across(bandOrder(p, declared, n, n));
    const perRow = Math.ceil(n / Math.ceil(n / MAX_ACROSS));
    const bandOf = bandOrder(p, declared, n, perRow);
    return across((id) => bandOf(id) % perRow);
  };
  if (n < 2 || m.diagram.direction === 'down') return stacked().laid;
  if (m.diagram.direction === 'right') return side().laid;
  const down = stacked();
  if (!bridged(p, declared) && rowsDown(p, declared) <= TALL) return down.laid;
  const right = side();
  return right.bad <= down.bad ? right.laid : down.laid;
}
