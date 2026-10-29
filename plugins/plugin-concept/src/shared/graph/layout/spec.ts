import type { Locale } from '@diagrist/lang';
import { type EdgeText, type GridNode, type GridSpec, layerGraph } from '@diagrist/layout-grid';
import type { Graph } from '../model.js';
import { columnsGrid, inColumns } from './columns.js';
import { type Cells, type ColumnHead, edgeId, edgesOf, texts, widestText } from './edges.js';
import { FIRST_ROW, GAP, graphMetrics, ITEM, type ItemBox, measureItem } from './metrics.js';

export { edgeId, edgesOf as drawn } from './edges.js';

/**
 * Gap between half columns: a label stands beside the line it names, so two lines in one gap need half the widest
 * label each, at least `GAP.col`.
 */
const columnGap = (all: readonly EdgeText[]): number => Math.max(GAP.col, Math.ceil(widestText(all) / 2 + GAP.label));

/**
 * The items layered along their relations, the second item of a relation below the first, above it for an `upward`
 * link and beside it for a `beside` one, in half columns so an item can stand between two others.
 */
function layersGrid(m: Graph, locale: Locale, boxes: ReadonlyMap<string, ItemBox>, indent: number): Cells {
  const relations = edgesOf(m);
  const edges = relations.map(([r]) => {
    const link = m.links.get(r.link);
    const up = link?.upward === true;
    return {
      from: up ? r.to : r.from,
      to: up ? r.from : r.to,
      rank: link?.beside === true ? (0 as const) : (1 as const),
    };
  });
  const { layers, position } = layerGraph({
    nodes: m.items.map((i) => i.id),
    edges,
    maxPerLayer: ITEM.perLayer,
    thorough: true,
  });
  const cells = new Map(
    layers.flatMap((layer, row) =>
      layer.map((id) => [id, { row, cross: Math.round(2 * (position.get(id) ?? 0)) }] as const),
    ),
  );
  const crosses = [...new Set([...cells.values()].flatMap((c) => [c.cross, c.cross + 1]))].sort((a, b) => a - b);
  const col = (c: number) => `c${crosses.indexOf(c) + 1}`;
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
  const labelled = texts(m, locale);
  return {
    cols: crosses.map((c) => ({ name: col(c), width: 0 })),
    rows: layers.map((_, row) => ({ name: `r${row + 1}` })),
    nodes,
    edges: relations.map(([r, i]) => ({ id: edgeId(i), from: r.from, to: r.to, source: r.span })),
    texts: labelled,
    metrics: { ...graphMetrics(m.subtitle ? FIRST_ROW.subtitle : FIRST_ROW.title, columnGap(labelled)), indent },
    heads: [],
  };
}

/** The grid of a graph picture, its edge texts and heads, with every item measured. */
export interface GraphGrid {
  readonly spec: GridSpec;
  readonly texts: readonly EdgeText[];
  readonly boxes: ReadonlyMap<string, ItemBox>;
  readonly heads: readonly ColumnHead[];
}

/**
 * The grid of a graph picture: a column per type when the items are of several types, else layers along the
 * relations. Each item has its own measures; the lines are orthogonal, leave and enter in the middle of a side, and
 * carry the label of the relation, else of the link unless `bare`.
 */
export function graphGrid(m: Graph, locale: Locale, indent = 0, headed = true): GraphGrid {
  const boxes = new Map(
    m.items.map((i) => [i.id, measureItem(i.label, i.entries, m.types.get(i.type)?.shape === 'person')] as const),
  );
  const cells = inColumns(m) ? columnsGrid(m, locale, boxes, indent, headed) : layersGrid(m, locale, boxes, indent);
  return {
    spec: {
      cols: cells.cols,
      rows: cells.rows,
      nodes: cells.nodes,
      groups: [],
      edges: cells.edges,
      metrics: cells.metrics,
      adaptive: true,
      ports: 'centred',
    },
    texts: cells.texts,
    boxes,
    heads: cells.heads,
  };
}
