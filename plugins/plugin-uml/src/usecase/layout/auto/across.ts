import { casesOf, depths, families, type Parts, type Side, slide, towardActors } from './parts.js';
import { type Plan, slice } from './plan.js';

/**
 * Side by side: every subject gets its own columns by include and extend depth, a lane for actors lies between two
 * subjects. `home` and `side` choose the lane per actor. A family of actors whose use cases all lie in subjects
 * narrower than their columns stands in the column next to them, not in the lane beyond the empty ones.
 */
export function acrossPlan(
  p: Parts,
  band: (id: string) => number,
  side: Map<string, Side>,
  home: ReadonlyMap<string, number>,
): Plan {
  const count = Math.max(0, ...p.cases.map((c) => band(c.id))) + 1;
  const laneOf = (id: string) => (home.get(id) ?? 0) + (side.get(id) === 'right' ? 1 : 0);
  const depth = new Map<string, number>();
  const start: number[] = [];
  let next = 0;
  for (let b = 0; b < count; b++) {
    const part = slice(p, band, b);
    const local = depths(part);
    const width = part.cases.length ? Math.max(0, ...local.values()) + 1 : 0;
    const toward = new Map(part.actors.map((a): [string, Side] => [a.id, laneOf(a.id) > b ? 'right' : 'left']));
    slide(part, local, toward, width);
    towardActors(part, local, toward);
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
  for (const members of families(p)) {
    const lane = laneX(laneOf(members[0] ?? ''));
    const cases = members.flatMap((id) => casesOf(id, p));
    const cols = cases.flatMap((c) => span.get(subject.get(c)) ?? []);
    const right = side.get(members[0] ?? '') === 'right';
    const own = right ? Math.max(...cols) + 1 : Math.min(...cols) - 1;
    const near = new Set(cases.map(band)).size === 1 && (right ? own < lane : own > lane);
    for (const id of members) actorX.set(id, near ? own : lane);
  }
  return { side, depth, actorX };
}
