import { depths, type Parts, type Side, towardActors } from './parts.js';
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
    towardActors(part, local, new Map(part.actors.map((a) => [a.id, laneOf(a.id) > b ? 'right' : 'left'])));
    start.push(next);
    const width = part.cases.length ? Math.max(0, ...local.values()) + 1 : 0;
    for (const [id, d] of local) depth.set(id, next + d);
    next += width + (b < count - 1 ? 1 : 0);
  }
  const columns = next;
  const laneX = (l: number) => (l <= 0 ? -1 : l >= count ? columns : (start[l] ?? 0) - 1);
  const used = new Set(p.actors.map((a) => laneOf(a.id)));
  const laneName = (l: number) => (l === 0 ? 'al' : l === count ? 'ar' : `am${l}`);
  const cols: string[] = [];
  if (used.has(0)) cols.push('al');
  const taken = new Set(depth.values());
  for (let x = 0; x < columns; x++) {
    const l = start.indexOf(x + 1);
    if (l > 0) {
      if (used.has(l)) cols.push(laneName(l));
    } else if (taken.has(x)) cols.push(`u${x + 1}`);
  }
  if (used.has(count)) cols.push('ar');
  const colOf = new Map<string, string>([...depth].map(([id, d]) => [id, `u${d + 1}`]));
  for (const a of p.actors) colOf.set(a.id, laneName(laneOf(a.id)));
  return {
    across: true,
    side,
    depth,
    columns,
    lane: new Map(p.actors.map((a) => [a.id, laneOf(a.id)])),
    actorX: new Map(p.actors.map((a) => [a.id, laneX(laneOf(a.id))])),
    cols,
    colOf,
  };
}
