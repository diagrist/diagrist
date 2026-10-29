import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import type { EdgeText, GridColumn, GridEdge, GridMetrics, GridNode, GridRow } from '@diagrist/layout-grid';
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

/** The texts on the lines: the label of the relation, else of its link unless the link is `bare`. */
export function texts(m: Graph, locale: Locale): EdgeText[] {
  return edgesOf(m).flatMap(([r, i]): EdgeText[] => {
    const link = m.links.get(r.link);
    const name = r.label ?? (link?.bare === false ? link.label[locale] : undefined);
    return name === undefined ? [] : [{ edge: edgeId(i), name }];
  });
}

/** Width of the widest text on a line. */
export const widestText = (all: readonly EdgeText[]): number =>
  Math.max(0, ...all.map((t) => textWidth(t.name ?? '', STANDARD_FONTS.label)));

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

/** What an arrangement hands the grid: columns, rows, nodes and edges, the texts on the lines, heads of columns. */
export interface Cells {
  readonly cols: readonly GridColumn[];
  readonly rows: readonly GridRow[];
  readonly nodes: readonly GridNode[];
  readonly edges: readonly GridEdge[];
  readonly texts: readonly EdgeText[];
  readonly metrics: GridMetrics;
  readonly heads: readonly ColumnHead[];
  readonly verbs: readonly ColumnVerb[];
}
