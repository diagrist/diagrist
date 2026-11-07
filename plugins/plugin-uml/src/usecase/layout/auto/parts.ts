import { type LayerEdge, layerGraph } from '@diagrist/layout-grid';
import type { Actor, KnownRelation, UseCase } from '../../diagram.js';

export type Side = 'left' | 'right';

/** What the automatic grid reads: actors, use cases and the relations whose kind is known. */
export interface Parts {
  readonly actors: readonly Actor[];
  readonly cases: readonly UseCase[];
  readonly relations: readonly KnownRelation[];
}

/**
 * Column per use case: the base left, included and extending cases right of it. A special case stays in the
 * column of its general one and stands below it, as in the textbook.
 */
export function depths(p: Parts): Map<string, number> {
  const ids = p.cases.map((c) => c.id);
  const isCase = new Set(ids);
  const edges = p.relations.flatMap((r): LayerEdge[] => {
    if (!isCase.has(r.from) || !isCase.has(r.to) || r.kind === 'association') return [];
    if (r.kind === 'generalization') return [{ from: r.from, to: r.to, rank: 0 }];
    return r.kind === 'include' ? [{ from: r.from, to: r.to, rank: 1 }] : [{ from: r.to, to: r.from, rank: 1 }];
  });
  const { layers } = layerGraph({ nodes: ids, edges, maxPerLayer: Number.POSITIVE_INFINITY });
  return new Map(layers.flatMap((layer, l) => layer.map((id) => [id, l] as const)));
}

/** Use cases an actor takes part in through associations, or the actors of a use case. */
export const casesOf = (id: string, p: Parts): string[] =>
  p.relations.flatMap((r) => (r.kind !== 'association' ? [] : r.from === id ? [r.to] : r.to === id ? [r.from] : []));

/** Is the use case joined to others by include, extend or a generalization? */
export const isLinked = (id: string, p: Parts): boolean =>
  p.relations.some((r) => r.kind !== 'association' && (r.from === id || r.to === id));

/**
 * A use case without include, extend and generalization hangs on actors only. When most of them stand right, it
 * moves to the last column of its own subject, so their lines do not run through the inner columns; never past it,
 * since a subject that shares its columns with a deeper one would grow as wide as that one and leave its middle empty.
 * The subjects in `still` keep their columns, since only the layout shows whether the move pays; returns the subjects
 * whose use cases moved.
 */
export function towardActors(
  p: Parts,
  depth: Map<string, number>,
  side: ReadonlyMap<string, Side>,
  still: ReadonlySet<string | undefined> = new Set(),
): Set<string | undefined> {
  const last = new Map<string | undefined, number>();
  for (const c of p.cases) last.set(c.subject, Math.max(last.get(c.subject) ?? 0, depth.get(c.id) ?? 0));
  const moved = new Set<string | undefined>();
  for (const c of p.cases) {
    const own = last.get(c.subject) ?? 0;
    if (!own || still.has(c.subject) || isLinked(c.id, p)) continue;
    const actors = casesOf(c.id, p);
    const right = actors.filter((a) => side.get(a) === 'right').length;
    if (right <= actors.length - right || depth.get(c.id) === own) continue;
    depth.set(c.id, own);
    moved.add(c.subject);
  }
  return moved;
}

/**
 * A subject narrower than the columns it shares with a deeper one stands in the columns next to the lane most of its
 * lines run to: right where more of its actors' lines lead right than left. So its frame keeps the width of its own
 * cases and its lines do not cross the empty columns beside it.
 */
export function slide(p: Parts, depth: Map<string, number>, side: ReadonlyMap<string, Side>, width: number): void {
  const groups = new Map<string | undefined, string[]>();
  for (const c of p.cases) groups.set(c.subject, [...(groups.get(c.subject) ?? []), c.id]);
  for (const ids of groups.values()) {
    const slack = width - 1 - Math.max(0, ...ids.map((id) => depth.get(id) ?? 0));
    const ends = ids.flatMap((id) => casesOf(id, p).map((a) => side.get(a)));
    const right = ends.filter((s) => s === 'right').length;
    if (slack > 0 && right > ends.length - right) for (const id of ids) depth.set(id, (depth.get(id) ?? 0) + slack);
  }
}

/** Actors joined by generalizations, each family in declaration order. */
export function families(p: Parts): string[][] {
  const ids = p.actors.map((a) => a.id);
  const family = new Map(ids.map((id) => [id, id]));
  const root = (id: string): string => {
    const up = family.get(id) ?? id;
    return up === id ? id : root(up);
  };
  for (const r of p.relations)
    if (r.kind === 'generalization' && family.has(r.from) && family.has(r.to)) family.set(root(r.from), root(r.to));
  const groups = new Map<string, string[]>();
  for (const id of ids) groups.set(root(id), [...(groups.get(root(id)) ?? []), id]);
  return [...groups.values()];
}
