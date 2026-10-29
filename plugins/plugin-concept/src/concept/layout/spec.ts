import type { Locale } from '@diagrist/lang';
import { type EdgeText, type GridEdge, type GridNode, type GridSpec, layerGraph } from '@diagrist/layout-grid';
import type { ConceptModel, Relation } from '../model.js';
import { conceptMetrics, FIRST_ROW, ITEM, type ItemBox, measureItem } from './metrics.js';

/** Id of the edge of the relation at `index` in source order. */
export const edgeId = (index: number): string => `rel-${index}`;

/** The relations drawn: both items there, two different ones, and a declared link; with their index. */
export function drawn(m: ConceptModel): (readonly [Relation, number])[] {
  const ids = new Set(m.items.map((i) => i.id));
  return m.relations.flatMap((r, i) =>
    ids.has(r.from) && ids.has(r.to) && r.from !== r.to && m.links.has(r.link) ? [[r, i] as const] : [],
  );
}

/** A grid of layers and its edge texts, with every item measured. */
export interface ConceptGrid {
  readonly spec: GridSpec;
  readonly texts: readonly EdgeText[];
  readonly boxes: ReadonlyMap<string, ItemBox>;
}

/**
 * The grid of a concept picture: the items layered along their relations, the second item of a relation below the
 * first, above it for an `upward` link and beside it for a `beside` one, in half columns so an item can stand between two others. Each item has
 * its own measures; the lines are orthogonal and carry the label of the relation, else of the link unless `bare`.
 */
export function conceptGrid(m: ConceptModel, locale: Locale): ConceptGrid {
  const relations = drawn(m);
  const edges = relations.map(([r]) => {
    const link = m.links.get(r.link);
    const up = link?.upward === true;
    return {
      from: up ? r.to : r.from,
      to: up ? r.from : r.to,
      rank: link?.beside === true ? (0 as const) : (1 as const),
    };
  });
  const { layers, position } = layerGraph({ nodes: m.items.map((i) => i.id), edges, maxPerLayer: ITEM.perLayer });
  const cells = new Map(
    layers.flatMap((layer, row) =>
      layer.map((id) => [id, { row, cross: Math.round(2 * (position.get(id) ?? 0)) }] as const),
    ),
  );
  const crosses = [...new Set([...cells.values()].flatMap((c) => [c.cross, c.cross + 1]))].sort((a, b) => a - b);
  const col = (c: number) => `c${crosses.indexOf(c) + 1}`;
  const boxes = new Map(
    m.items.map((i) => [i.id, measureItem(i.label, i.entries, m.types.get(i.type)?.shape === 'person')] as const),
  );
  const nodes = m.items.flatMap((item): GridNode[] => {
    const at = cells.get(item.id);
    const box = boxes.get(item.id);
    if (!at || !box) return [];
    return [
      {
        id: item.id,
        col: col(at.cross),
        row: `r${at.row + 1}`,
        to: { col: col(at.cross + 1) },
        width: box.w,
        height: box.h,
        shape: 'box',
        source: item.span,
      },
    ];
  });
  const gridEdges = relations.map(([r, i]): GridEdge => ({ id: edgeId(i), from: r.from, to: r.to, source: r.span }));
  const texts = relations.flatMap(([r, i]): EdgeText[] => {
    const link = m.links.get(r.link);
    const name = r.label ?? (link?.bare === false ? link.label[locale] : undefined);
    return name === undefined ? [] : [{ edge: edgeId(i), name }];
  });
  return {
    spec: {
      cols: crosses.map((c) => ({ name: col(c), width: 0 })),
      rows: layers.map((_, row) => ({ name: `r${row + 1}` })),
      nodes,
      groups: [],
      edges: gridEdges,
      metrics: conceptMetrics(m.subtitle ? FIRST_ROW.subtitle : FIRST_ROW.title),
      adaptive: true,
    },
    texts,
    boxes,
  };
}
