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

/** Neighbours without direction: associations, include, extend and generalizations. */
export function neighbours(p: Parts): Map<string, string[]> {
  const out = new Map<string, string[]>([...p.actors, ...p.cases].map((m) => [m.id, []]));
  for (const r of p.relations) {
    if (r.from === r.to) continue;
    out.get(r.from)?.push(r.to);
    out.get(r.to)?.push(r.from);
  }
  return out;
}

/** Use cases an actor takes part in through associations, or the actors of a use case. */
export const casesOf = (id: string, p: Parts): string[] =>
  p.relations.flatMap((r) => (r.kind !== 'association' ? [] : r.from === id ? [r.to] : r.to === id ? [r.from] : []));

/** Is the use case joined to others by include, extend or a generalization? */
export const isLinked = (id: string, p: Parts): boolean =>
  p.relations.some((r) => r.kind !== 'association' && (r.from === id || r.to === id));

/**
 * A use case without include, extend and generalization hangs on actors only. When most of them stand right, it
 * moves to the last column, so their lines do not run through the inner columns.
 */
export function towardActors(p: Parts, depth: Map<string, number>, side: ReadonlyMap<string, Side>): void {
  const last = Math.max(0, ...depth.values());
  if (!last) return;
  for (const c of p.cases) {
    if (isLinked(c.id, p)) continue;
    const actors = casesOf(c.id, p);
    const right = actors.filter((a) => side.get(a) === 'right').length;
    if (right > actors.length - right) depth.set(c.id, last);
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
