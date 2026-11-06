import type { Graph, Relation } from '../model.js';

/** Id of the edge of the relation at `index` in source order. */
export const edgeId = (index: number): string => `rel-${index}`;

/** The relations drawn: both items there, two different ones, and a declared link; with their index. */
export function edgesOf(m: Graph): (readonly [Relation, number])[] {
  const ids = new Set(m.items.map((i) => i.id));
  return m.relations.flatMap((r, i) =>
    ids.has(r.from) && ids.has(r.to) && r.from !== r.to && m.links.has(r.link) ? [[r, i] as const] : [],
  );
}

/** A head above a column, naming the type of its items. */
export interface ColumnHead {
  readonly col: string;
  readonly text: string;
}

/** A verb in the head row between two neighbouring columns, standing for every line between them. */
export interface ColumnVerb {
  readonly left: string;
  readonly right: string;
  readonly text: string;
  readonly link: string;
}
