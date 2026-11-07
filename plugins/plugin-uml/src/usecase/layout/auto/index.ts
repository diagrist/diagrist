import { isKnown } from '../../diagram.js';
import type { UseCaseModel } from '../../model.js';
import { type Laid, laidUseCase } from '../laid.js';
import { acrossPlans } from './across.js';
import { flipFamilies, type Priced } from './flip.js';
import { bandOrders } from './order.js';
import { depths, type Parts, type Side } from './parts.js';
import { acrossSides, bandIndex, bridged, type Plan, stackedPlan } from './plan.js';
import { sides } from './sides.js';
import { slack } from './slack.js';

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
 * What a laid out picture costs by the measure of the line check, whether it is clean, how many crossings and
 * findings of the check it has, and what it would cost without them (`base`).
 */
export type Price = (laid: Laid) => {
  readonly cost: number;
  readonly clean: boolean;
  readonly bad: number;
  readonly base: number;
};

/** A plan laid out and priced, with the notes it kept room for (`held`). */
type Tried = Priced & {
  readonly laid: Laid;
  readonly plan: Plan;
  readonly held: ReadonlySet<string>;
  readonly bad: number;
  readonly base: number;
};

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
 * would grow too tall; then side by side, more than three in columns whose subjects the order stacks, or as `direction`
 * says otherwise. Side by side, every set of columns of the order stage is laid out, since which subjects share a
 * column only the layout shows, and while one is not clean its families of actors try the other side; the declared set
 * first, another wins by fewer lines through boxes, crossings and lines past a foreign subject, or on as many where it
 * is cheaper by `SWITCH`, so shorter lines and a smaller picture choose the order of the subjects. Each set of sides
 * lays out the plans of `acrossPlans`, the columns of actors and of free use cases as choices, and keeps the one with
 * the fewest of these, then the cheapest. Since the families flip one after another, more choices can lead the search
 * to another and dearer end; so the search runs once without the choices and once with them, and the cheaper picture
 * stays. Below each other is tried only where side by side is not clean of these, and wins where it has fewer; there
 * each set of sides lays out the plan with every family in its lane and, where one differs, the plan with the families
 * whose use cases all lie in inner columns above or below the subjects (`stackedPlan`), and keeps the cheaper. Notes
 * take free spots; where one finds none near its anchor, the picture is laid out once more with room for it beside its
 * anchor, and the cheaper stays, a note on a box or text costing as much as a line through a box, one on a line or
 * frame line as a text on a line. The chosen plan is laid out once more with the use cases of every subject closed up
 * in their columns (`given.pack`), which stays where it is cheaper; packed for every plan, a subject took the room its
 * notes wanted. It is not tried where no subject has a gap to close (`slack`), nor where the picture keeps room for a
 * note, which packing would take.
 */
export function arrangeUseCase(m: UseCaseModel, price: Price): Laid {
  const p: Parts = { actors: m.diagram.actors, cases: m.diagram.cases, relations: m.diagram.relations.filter(isKnown) };
  const tried = (plan: Plan): Tried => {
    const free = laidUseCase(m, plan);
    const first: Tried = { laid: free, side: plan.side, plan, held: new Set(), ...price(free) };
    if (free.crowded.length === 0) return first;
    const ids = new Set(free.crowded.map((c) => c.id));
    const held = laidUseCase(m, plan, ids);
    const second: Tried = { laid: held, side: plan.side, plan, held: ids, ...price(held) };
    return second.cost < first.cost ? second : first;
  };
  const cheaper = (a: Tried, b: Tried) => b.bad < a.bad || (b.bad === a.bad && b.cost < a.cost);
  const packed = (t: Tried): Laid => {
    if (t.held.size > 0 || !slack(m, t.laid)) return t.laid;
    const laid = laidUseCase(m, t.plan, t.held, true);
    return cheaper(t, { ...t, laid, ...price(laid) }) ? laid : t.laid;
  };
  const declared = bandIndex(m);
  const n = m.diagram.subjects.length;
  const stacked = (): Tried => {
    const run = (s: Map<string, Side>) => {
      const plain = stackedPlan(p, s);
      const lane = tried(plain);
      const over = stackedPlan(p, s, true);
      if ([...over.actorX].every(([id, x]) => plain.actorX.get(id) === x)) return lane;
      const got = tried(over);
      return cheaper(lane, got) ? got : lane;
    };
    return flipFamilies(p, run(sides(p, depths(p))), run);
  };
  const across = (column: (id: string) => number, choose: boolean) => {
    const { side, home, fixed } = acrossSides(p, column);
    const run = (s: Map<string, Side>) =>
      acrossPlans(p, column, s, home, choose)
        .map(tried)
        .reduce((best, got) => (cheaper(best, got) ? got : best));
    return { first: run(side), run, fixed };
  };
  const flipped = (c: ReturnType<typeof across>) => flipFamilies(p, c.first, c.run, c.fixed);
  const sideBy = (choose: boolean): Tried => {
    const perRow = n <= MAX_ACROSS ? n : Math.ceil(n / Math.ceil(n / MAX_ACROSS));
    const [own, ...others] = bandOrders(p, declared, n, perRow, COLUMN_SETS).map((bandOf) =>
      n <= MAX_ACROSS ? bandOf : (id: string) => bandOf(id) % perRow,
    );
    const [first, ...rest] = [own ?? declared, ...others].map((column) => across(column, choose));
    let best = flipped(first ?? across(declared, choose));
    rest.sort((a, b) => a.first.bad - b.first.bad || a.first.cost - b.first.cost);
    for (const c of rest) {
      if (best.clean && c.first.base >= best.cost - SWITCH) continue;
      const got = flipped(c);
      if (got.bad < best.bad || (got.bad === best.bad && got.cost < best.cost - SWITCH)) best = got;
    }
    return best;
  };
  const side = (): Tried => {
    const fixed = sideBy(false);
    const chosen = sideBy(true);
    return cheaper(fixed, chosen) ? chosen : fixed;
  };
  const chosen = (): Tried => {
    if (n < 2 || m.diagram.direction === 'down') return stacked();
    if (m.diagram.direction === 'right') return side();
    if (!bridged(p, declared) && rowsDown(p, declared) <= TALL) return stacked();
    const right = side();
    if (right.bad === 0) return right;
    const down = stacked();
    return right.bad <= down.bad ? right : down;
  };
  return packed(chosen());
}
