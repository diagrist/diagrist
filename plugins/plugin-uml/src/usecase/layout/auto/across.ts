import { depths, type Parts, type Side, slide, towardActors } from './parts.js';
import { type Plan, slice } from './plan.js';

/**
 * Side by side: every subject gets its own columns by include and extend depth, a lane for actors lies between two
 * subjects. `home` and `side` choose the lane per actor.
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
  return { side, depth, actorX: new Map(p.actors.map((a) => [a.id, laneX(laneOf(a.id))])) };
}
