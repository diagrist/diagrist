import type { Locale } from '@diagrist/lang';
import { type GridNode, layerGraph } from '@diagrist/layout-grid';
import type { Graph } from '../model.js';
import { columnEdges } from './column-edges.js';
import { type Cells, edgesOf } from './edges.js';
import { FIRST_ROW, graphMetrics, HEAD, type ItemBox } from './metrics.js';

/** The types the items use, in the order of their declaration: the order the columns tell the story in. */
export const usedTypes = (m: Graph): string[] => [...m.types.keys()].filter((t) => m.items.some((i) => i.type === t));

/** Whether the items stand in a column per type: as asked, or when they are of more than one type. */
export const inColumns = (m: Graph): boolean =>
  (m.arrange ?? (usedTypes(m).length > 1 ? 'columns' : 'layers')) === 'columns';

/**
 * The grid of a graph picture in columns: one column per type in the order of the declarations, and in each column
 * the items ordered so related items stand side by side, an item with two partners in a row between theirs. Of an
 * order and its mirror, which cross alike, the one that keeps the first column in the order written wins. The items
 * of a column are as wide as its widest, so the columns read as a table; the lines are `columnEdges`.
 */
export function columnsGrid(
  m: Graph,
  locale: Locale,
  boxes: ReadonlyMap<string, ItemBox>,
  indent: number,
  headed: boolean,
): Cells {
  const types = usedTypes(m);
  const fixed = new Map(m.items.map((i) => [i.id, Math.max(0, types.indexOf(i.type))]));
  const relations = edgesOf(m);
  const { layers, position } = layerGraph({
    nodes: m.items.map((i) => i.id),
    edges: relations.map(([r]) => ({ from: r.from, to: r.to, rank: 1 as const })),
    maxPerLayer: Number.POSITIVE_INFINITY,
    thorough: true,
    fixed,
  });
  const order = (id: string) => m.items.findIndex((i) => i.id === id);
  const lead = layers[0] ?? [];
  const mirrored = lead.length > 1 && order(lead[0] ?? '') > order(lead.at(-1) ?? '');
  const most = Math.max(0, ...position.values());
  const cross = (id: string) => Math.round(2 * (mirrored ? most - (position.get(id) ?? 0) : (position.get(id) ?? 0)));
  const at = new Map(layers.flatMap((layer, col) => layer.map((id) => [id, { col, cross: cross(id) }] as const)));
  const taken = new Set([...at.values()].map((c) => c.cross));
  const between = (c: number) => c % 2 === 1 && taken.has(c - 1) && taken.has(c + 1);
  const crosses = [...taken].filter((c) => !between(c)).sort((a, b) => a - b);
  const row = (c: number) => `r${crosses.indexOf(c) + 1}`;
  const widths = new Map<number, number>();
  for (const [id, cell] of at) widths.set(cell.col, Math.max(widths.get(cell.col) ?? 0, boxes.get(id)?.w ?? 0));
  const metrics = graphMetrics(m.subtitle ? FIRST_ROW.subtitle : FIRST_ROW.title, 0);
  const nodes = m.items.flatMap((item): GridNode[] => {
    const cell = at.get(item.id);
    const box = boxes.get(item.id);
    if (!cell || !box) return [];
    return [
      {
        id: item.id,
        col: `k${cell.col + 1}`,
        ...(between(cell.cross)
          ? { row: row(cell.cross - 1), to: { row: row(cell.cross + 1) }, rowHeight: 0 }
          : { row: row(cell.cross) }),
        width: widths.get(cell.col) ?? box.w,
        height: box.h,
        shape: 'box',
        source: item.span,
      },
    ];
  });
  const column = (id: string) => at.get(id)?.col ?? 0;
  const lines = columnEdges(m, locale, column, headed);
  return {
    cols: types.map((_, k) => ({ name: `k${k + 1}`, width: 0 })),
    rows: crosses.map((c) => ({ name: row(c) })),
    nodes,
    edges: lines.edges,
    texts: lines.texts,
    verbs: lines.verbs,
    metrics: {
      ...metrics,
      firstRowY: metrics.firstRowY + (headed ? HEAD.room : 0),
      colGap: HEAD.colGap([...lines.texts, ...lines.verbs.map((v) => ({ edge: v.left, name: v.text }))], lines.forks),
      subColGap: HEAD.colGap(
        [...lines.texts, ...lines.verbs.map((v) => ({ edge: v.left, name: v.text }))],
        lines.forks,
      ),
      rowGap: HEAD.rowGap,
      indent,
    },
    heads: headed ? types.map((t, k) => ({ col: `k${k + 1}`, text: m.types.get(t)?.label[locale] ?? t })) : [],
  };
}
