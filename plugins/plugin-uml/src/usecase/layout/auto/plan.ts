import type { UseCaseModel } from '../../model.js';
import { casesOf, depths, families, type Parts, type Side, towardActors } from './parts.js';
import { sides } from './sides.js';

/**
 * Column plan of the automatic grid: a column per use case, a lane per actor and the abstract x of actors. Below each
 * other there are two lanes (left, right); side by side one more than subjects: left of the first, between each two,
 * right of the last.
 */
export interface Plan {
  readonly across: boolean;
  readonly side: Map<string, Side>;
  readonly depth: Map<string, number>;
  readonly columns: number;
  /** Lane per actor; actors of one lane stand in one column of the grid. */
  readonly lane: ReadonlyMap<string, number>;
  /** x of an actor in the abstract grid, where the column of a use case is its x. */
  readonly actorX: ReadonlyMap<string, number>;
  readonly cols: readonly string[];
  readonly colOf: ReadonlyMap<string, string>;
  /** Subjects in rows and columns of a grid: row and column of the subject per use case. */
  readonly grid?: { readonly row: (id: string) => number; readonly column: (id: string) => number };
}

/** Subject per use case as its number in declaration order; use cases without subject and actors after them. */
export function bandIndex(model: UseCaseModel): (id: string) => number {
  const subjects = model.diagram.subjects.map((s) => s.id);
  return (id) => {
    const s = model.cases.get(id)?.subject;
    return s === undefined ? subjects.length : subjects.indexOf(s);
  };
}

/** Below each other: the base left, actors left or right of the one column of subjects. */
export function stackedPlan(p: Parts, side: Map<string, Side>): Plan {
  const depth = depths(p);
  towardActors(p, depth, side);
  const columns = Math.max(0, ...depth.values()) + 1;
  const has = (s: Side) => p.actors.some((a) => side.get(a.id) === s);
  const inner = Array.from({ length: columns }, (_, c) => `u${c + 1}`);
  const colOf = new Map<string, string>(p.cases.map((u) => [u.id, inner[depth.get(u.id) ?? 0] ?? 'u1']));
  for (const a of p.actors) colOf.set(a.id, side.get(a.id) === 'right' ? 'ar' : 'al');
  return {
    across: false,
    side,
    depth,
    columns,
    lane: new Map(p.actors.map((a) => [a.id, side.get(a.id) === 'right' ? 1 : 0])),
    actorX: new Map(p.actors.map((a) => [a.id, side.get(a.id) === 'right' ? columns : -1])),
    cols: [...(has('left') ? ['al'] : []), ...inner, ...(has('right') ? ['ar'] : [])],
    colOf,
  };
}

/** The part of the diagram in one subject: its use cases, the actors taking part, the relations among them. */
export function slice(p: Parts, band: (id: string) => number, b: number): Parts {
  const cases = p.cases.filter((c) => band(c.id) === b);
  const ids = new Set(cases.map((c) => c.id));
  const actors = p.actors.filter((a) => casesOf(a.id, p).some((c) => ids.has(c)));
  for (const a of actors) ids.add(a.id);
  return { cases, actors, relations: p.relations.filter((r) => ids.has(r.from) && ids.has(r.to)) };
}

/** Subjects whose use cases a family of actors takes part in, ascending. */
export const bandsOf = (members: readonly string[], p: Parts, band: (id: string) => number): number[] =>
  [...new Set(members.flatMap((id) => casesOf(id, p).map(band)))].sort((a, b) => a - b);

/** Does a family of actors take part in use cases of more than one subject? */
export const bridged = (p: Parts, band: (id: string) => number): boolean =>
  families(p).some((members) => bandsOf(members, p, band).length > 1);

/**
 * Side per actor relative to its subject (`home`). A family with use cases in two subjects stands in the lane
 * between them and stays there (`fixed`); the others choose left or right as below each other.
 */
export function acrossSides(
  p: Parts,
  band: (id: string) => number,
): { side: Map<string, Side>; home: Map<string, number>; fixed: Set<string> } {
  const count = Math.max(0, ...p.cases.map((c) => band(c.id))) + 1;
  const side = new Map<string, Side>();
  const home = new Map<string, number>();
  const fixed = new Set<string>();
  const local = Array.from({ length: count }, (_, b) => {
    const part = slice(p, band, b);
    return sides(part, depths(part));
  });
  for (const members of families(p)) {
    const bands = bandsOf(members, p, band);
    const first = bands[0] ?? 0;
    const last = bands.at(-1) ?? 0;
    if (bands.length > 1) {
      const lane = Math.min(last, Math.max(first + 1, Math.round((first + last + 1) / 2)));
      for (const id of members) {
        side.set(id, 'right');
        home.set(id, lane - 1);
        fixed.add(id);
      }
      continue;
    }
    const own = members.map((id) => local[first]?.get(id)).find((s) => s !== undefined) ?? 'left';
    for (const id of members) {
      home.set(id, first);
      side.set(id, p.actors.find((a) => a.id === id)?.side ?? own);
    }
  }
  return { side, home, fixed };
}
