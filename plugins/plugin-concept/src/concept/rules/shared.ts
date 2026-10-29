import type { Rule } from '@diagrist/core';
import type { ConceptModel, Item, Relation } from '../model.js';

/** A rule of concept pictures. */
export type ConceptRule = Rule<ConceptModel>;

/** The items by their ids, for rules that look up the type of a relation's ends. */
export const itemsById = (m: ConceptModel): ReadonlyMap<string, Item> => new Map(m.items.map((i) => [i.id, i]));

/** Relations whose link and both items are declared, so the rules about links can read them. */
export function known(m: ConceptModel): Relation[] {
  const items = itemsById(m);
  return m.relations.filter((r) => m.links.has(r.link) && items.has(r.from) && items.has(r.to));
}
