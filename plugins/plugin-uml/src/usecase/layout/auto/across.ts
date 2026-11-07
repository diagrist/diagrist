import { casesOf, depths, families, type Parts, type Side, slide, towardActors } from './parts.js';
import { type Plan, slice } from './plan.js';

/** At most this many plans per set of sides: with more choices, one switch for all families and one for all subjects. */
const PLANS = 8;

/**
 * The choices of a plan side by side. A family in `tight` stands in the last column of its use cases, not in the one
 * next to them; the free use cases of a subject in `still` keep their column instead of moving toward their actors.
 */
interface Choice {
  readonly tight: ReadonlySet<string>;
  readonly still: ReadonlySet<string | undefined>;
}

/** A plan with the choices it could take otherwise: the families whose column differs, the subjects that moved. */
interface Open {
  readonly plan: Plan;
  readonly families: readonly string[];
  readonly subjects: readonly (string | undefined)[];
}

/**
 * Side by side: every subject gets its own columns by include and extend depth, a lane for actors lies between two
 * subjects. `home` and `side` choose the lane per actor. A family of actors whose use cases all lie in subjects
 * narrower than their columns stands near them, not in the lane beyond the empty ones: in the column next to its use
 * cases or in the last of them, beside a subject in another row or above or below its own. Whether the column beside or the
 * column of the cases is better, and whether the free use cases of a subject move toward their actors, only the
 * layout shows; so every combination of these choices is a plan of its own, the first the plan without a choice
 * taken, up to `PLANS`, and beyond that the families all together and the subjects all together.
 */
export function acrossPlans(
  p: Parts,
  band: (id: string) => number,
  side: Map<string, Side>,
  home: ReadonlyMap<string, number>,
  choose = true,
): Plan[] {
  const none: Choice = { tight: new Set(), still: new Set() };
  const first = acrossPlan(p, band, side, home, none);
  if (!choose) return [first.plan];
  const keys = [...first.families.map((f) => ({ family: f })), ...first.subjects.map((s) => ({ subject: s }))];
  const each = 2 ** keys.length <= PLANS;
  const switches = each
    ? keys.map((k) => [k])
    : [keys.filter((k) => 'family' in k), keys.filter((k) => 'subject' in k)];
  const used = switches.filter((s) => s.length > 0);
  const plans = [first.plan];
  for (let mask = 1; mask < 2 ** used.length; mask++) {
    const on = used.filter((_, i) => mask & (1 << i)).flat();
    const choice: Choice = {
      tight: new Set(on.flatMap((k) => ('family' in k ? [k.family] : []))),
      still: new Set(on.flatMap((k) => ('subject' in k ? [k.subject] : []))),
    };
    plans.push(acrossPlan(p, band, side, home, choice).plan);
  }
  return plans;
}

/** The plan side by side under one choice, with the choices it leaves open. */
function acrossPlan(
  p: Parts,
  band: (id: string) => number,
  side: Map<string, Side>,
  home: ReadonlyMap<string, number>,
  choice: Choice,
): Open {
  const count = Math.max(0, ...p.cases.map((c) => band(c.id))) + 1;
  const laneOf = (id: string) => (home.get(id) ?? 0) + (side.get(id) === 'right' ? 1 : 0);
  const depth = new Map<string, number>();
  const start: number[] = [];
  const subjects: (string | undefined)[] = [];
  let next = 0;
  for (let b = 0; b < count; b++) {
    const part = slice(p, band, b);
    const local = depths(part);
    const width = part.cases.length ? Math.max(0, ...local.values()) + 1 : 0;
    const toward = new Map(part.actors.map((a): [string, Side] => [a.id, laneOf(a.id) > b ? 'right' : 'left']));
    slide(part, local, toward, width);
    subjects.push(...towardActors(part, local, toward, choice.still));
    start.push(next);
    for (const [id, d] of local) depth.set(id, next + d);
    next += width + (b < count - 1 ? 1 : 0);
  }
  const columns = next;
  const laneX = (l: number) => (l <= 0 ? -1 : l >= count ? columns : (start[l] ?? 0) - 1);
  const subject = new Map(p.cases.map((c) => [c.id, c.subject]));
  const span = new Map<string | undefined, number[]>();
  for (const c of p.cases) span.set(c.subject, [...(span.get(c.subject) ?? []), depth.get(c.id) ?? 0]);
  const actorX = new Map<string, number>();
  const open: string[] = [];
  for (const members of families(p)) {
    const key = members[0] ?? '';
    const lane = laneX(laneOf(key));
    const cases = members.flatMap((id) => casesOf(id, p));
    const cols = cases.flatMap((c) => span.get(subject.get(c)) ?? []);
    const right = side.get(key) === 'right';
    const one = new Set(cases.map(band)).size === 1;
    const at = (gap: number) => {
      const own = right ? Math.max(...cols) + gap : Math.min(...cols) - gap;
      return one && (right ? own < lane : own > lane) ? own : lane;
    };
    if (at(0) !== at(1)) open.push(key);
    for (const id of members) actorX.set(id, at(choice.tight.has(key) ? 0 : 1));
  }
  return { plan: { side, depth, actorX }, families: open, subjects };
}
