import type { Locale } from '@diagrist/lang';
import { type GraphEdge, type LayeredLayout, layoutGraph } from '@diagrist/layout-grid';
import { MARGIN } from '@diagrist/parts';
import type { Graph } from '../model.js';
import type { Arranged } from './arranged.js';
import { arrangementOf } from './arrangement.js';
import { columnEdges } from './column-edges.js';
import { type PlacedColumn, placeHeads } from './heads.js';
import { labelOf, METRICS } from './layered.js';
import { FIRST_ROW, GAP, HEAD, measureItem } from './metrics.js';

/** The types the items use, in the order of their declaration: the order the columns tell the story in. */
export const usedTypes = (m: Graph): string[] => [...m.types.keys()].filter((t) => m.items.some((i) => i.type === t));

/** Whether the items stand in a column per type, as `arrangementOf` decides. */
export const inColumns = (m: Graph): boolean => arrangementOf(m) === 'columns';

/** Room between the rule of a head and the verb's arrow beside it, on either side. */
const INSET = 10;

/**
 * A picture in columns, laid out by the layered pipeline turned to run right (ADR 0034): one layer per type in the
 * order of the declarations, the order within each found by the order stage, so a line across a column takes a
 * place of its own in it. Of an order and its mirror, which cross alike, the one that keeps the first column in
 * the order written wins. The items of a column are as wide as its widest, so the columns read as a table; the
 * lines and their words are `columnEdges`, and the heads with the verbs between them stand above the columns.
 */
export function inColumnLayers(m: Graph, locale: Locale, headed: boolean): Arranged {
  const boxes = new Map(
    m.items.map((i) => [i.id, measureItem(i.label, i.entries, m.types.get(i.type)?.shape === 'person')] as const),
  );
  const types = usedTypes(m);
  const columnOf = new Map(m.items.map((i) => [i.id, Math.max(0, types.indexOf(i.type))]));
  const column = (id: string) => columnOf.get(id) ?? 0;
  const lines = columnEdges(m, locale, column, headed);
  const widths = types.map((_, k) =>
    Math.max(0, ...m.items.filter((i) => column(i.id) === k).map((i) => boxes.get(i.id)?.w ?? 0)),
  );
  const edges = lines.edges.map((e): GraphEdge => {
    const word = e.text;
    return {
      id: e.id,
      from: e.from,
      to: e.to,
      rank: column(e.from) === column(e.to) ? 'beside' : 'down',
      ...(e.bundle === undefined ? {} : { bundle: e.bundle, trunk: 'whole' as const }),
      ...(word === undefined || word === '' ? {} : { label: labelOf(word) }),
      ...(e.source === undefined ? {} : { source: e.source }),
    };
  });
  const verbRoom = Math.max(0, ...lines.verbs.map((v) => labelOf(v.text).width + 2 * (INSET + GAP.label)));
  const top = (m.subtitle ? FIRST_ROW.subtitle : FIRST_ROW.title) + (headed ? HEAD.room : 0);
  const laid = (ranks: readonly (readonly string[])[], order: 'free' | 'kept') =>
    layoutGraph({
      nodes: m.items.map((i) => ({
        id: i.id,
        width: widths[column(i.id)] ?? 0,
        height: boxes.get(i.id)?.h ?? 0,
        source: i.span,
      })),
      edges,
      metrics: {
        ...METRICS,
        rowGapMin: Math.ceil(Math.max(METRICS.rowGapMin, verbRoom)),
        left: MARGIN,
        top,
      },
      given: { ranks, order, direction: 'right' },
    });
  const first = laid(
    types.map((t) => m.items.flatMap((i) => (i.type === t ? [i.id] : [])).reverse()),
    'free',
  );
  const layout = mirrored(m, first, types) ? laid(columnsOf(first, types, column), 'kept') : first;
  const placedColumns = types.map((_, k): PlacedColumn => {
    const rects = layout.nodes.filter((n) => column(n.id) === k).map((n) => n.rect);
    const x = Math.min(...rects.map((r) => r.x));
    return { name: `k${k + 1}`, x, w: Math.max(...rects.map((r) => r.x + r.w)) - x };
  });
  const named = headed ? types.map((t, k) => ({ col: `k${k + 1}`, text: m.types.get(t)?.label[locale] ?? t })) : [];
  const row = placeHeads(placedColumns, top, named, lines.verbs, m.links);
  return {
    nodes: layout.nodes,
    routes: layout.routes,
    labels: layout.labels,
    boxes,
    heads: row.heads,
    verbs: row.verbs,
    width: layout.width + MARGIN,
    bottom: layout.bottom + MARGIN,
    placed: [...layout.placed, ...row.placed],
  };
}

/**
 * The items of every column top to bottom as `layout` placed them. Given as the layers of a picture that runs right,
 * the first of a layer comes to stand at the bottom, so this order turns the picture upside down.
 */
function columnsOf(layout: LayeredLayout, types: readonly string[], column: (id: string) => number): string[][] {
  const y = (id: string) => layout.nodes.find((n) => n.id === id)?.rect.y ?? 0;
  return types.map((_, k) =>
    layout.nodes
      .filter((n) => column(n.id) === k)
      .map((n) => n.id)
      .sort((a, b) => y(a) - y(b)),
  );
}

/** Whether the first column reads against the order its items are written in, last written on top. */
function mirrored(m: Graph, layout: LayeredLayout, types: readonly string[]): boolean {
  const types0 = new Map(m.items.map((i) => [i.id, i.type === types[0] ? 0 : 1]));
  const lead = columnsOf(layout, types, (id) => types0.get(id) ?? 1)[0] ?? [];
  const order = (id: string) => m.items.findIndex((i) => i.id === id);
  return lead.length > 1 && order(lead[0] ?? '') > order(lead.at(-1) ?? '');
}
