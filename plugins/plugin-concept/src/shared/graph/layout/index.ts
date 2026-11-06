import { type Area, type Placed, type Rect, textWidth } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import type { CoreFrame, EdgeLabel, Route } from '@diagrist/layout-grid';
import { LEGEND, type Legend, legendLayout, MARGIN } from '@diagrist/parts';
import type { LinkDecl, TypeDecl } from '../../declarations.js';
import type { Graph, GraphWords, Item, Relation } from '../model.js';
import { inLayers } from './arranged.js';
import { inColumnLayers, inColumns } from './columns.js';
import { edgesOf as drawn, edgeId } from './edges.js';
import type { PlacedHead, PlacedVerb } from './heads.js';
import { distinctLines } from './lines.js';
import { GRAPH_FONTS as F, type ItemBox } from './metrics.js';

/** What the legend shows a sample of: a type with its shape, a link with its line and head, or a status. */
export type Sample =
  | { readonly kind: 'type'; readonly type: TypeDecl }
  | { readonly kind: 'link'; readonly link: LinkDecl }
  | { readonly kind: 'status'; readonly status: 'planned' | 'deprecated' }
  | { readonly kind: 'area'; readonly area: Area };

/** An item in the picture: where it stands, how it is drawn, and its texts. */
export interface PlacedItem {
  readonly item: Item;
  readonly type?: TypeDecl;
  readonly rect: Rect;
  readonly box: ItemBox;
}

/** A line in the picture: its route and the link that decides how it is drawn. */
export interface PlacedLine {
  readonly route: Route;
  readonly link: LinkDecl;
  readonly relation: Relation;
  /** The relation's index in source order, which its DOM id carries. */
  readonly index: number;
}

/** Everything the scene draws, in picture pixels. */
export interface GraphLayout {
  readonly items: readonly PlacedItem[];
  readonly lines: readonly PlacedLine[];
  /** The labels of the lines, each with the relation of its line. */
  readonly labels: readonly (EdgeLabel & { readonly relation?: Relation })[];
  readonly legend: Legend<Sample>;
  /** The heads above the columns, each centred on its column with a rule as wide as the column below it. */
  readonly heads: readonly PlacedHead[];
  /** The verbs between the heads, each standing for every line between its two columns. */
  readonly verbs: readonly PlacedVerb[];
  /** The frame around the core of a hub, with its head. */
  readonly frame?: CoreFrame;
  readonly width: number;
  readonly height: number;
  readonly placed: readonly Placed[];
}

/** Room between the content and the legend below it. */
const LEGEND_GAP = 40;

/**
 * The legend's samples: the types, links and statuses the picture uses, in the order of their declarations. A
 * picture in columns says the rest itself: the heads name the types, and a link that is not `bare` stands on its line.
 */
function samples(m: Graph, headed: boolean): Sample[] {
  const types = new Set(m.items.map((i) => i.type));
  const links = new Set(drawn(m).map(([r]) => r.link));
  const statuses = (['planned', 'deprecated'] as const).filter((s) => m.items.some((i) => i.status === s));
  const joined = new Set([...m.items, ...m.relations].map((x) => x.area));
  return [
    ...[...m.types.values()].filter((t) => types.has(t.id) && !headed).map((type): Sample => ({ kind: 'type', type })),
    ...[...m.links.values()]
      .filter((l) => links.has(l.id) && (l.bare || !headed))
      .map((link): Sample => ({ kind: 'link', link })),
    ...statuses.map((status): Sample => ({ kind: 'status', status })),
    ...(m.areas?.list ?? []).filter((a) => joined.has(a.id)).map((area): Sample => ({ kind: 'area', area })),
  ];
}

function legendText(s: Sample, locale: Locale, w: GraphWords): string {
  if (s.kind === 'type') return s.type.label[locale];
  if (s.kind === 'link') return s.link.label[locale];
  return s.kind === 'area' ? s.area.label : w.status[s.status];
}

/**
 * Lays out a graph picture on `layout-grid` by the layered pipeline: a picture in columns turned to run right, with
 * the heads of the columns, any other in layers; then the legend of what the picture does not say itself, unless
 * `options` leave it out. Links the legend alone tells apart are drawn with lines that differ (`distinctLines`).
 */
export function layoutGraph(
  model: Graph,
  w: GraphWords,
  title: string,
  locale: Locale,
  options: { readonly legend: boolean; readonly heads: boolean } = { legend: true, heads: true },
): GraphLayout {
  const columns = inColumns(model);
  const m = distinctLines(model, (id) => columns && model.links.get(id)?.bare === false);
  const at = columns ? inColumnLayers(m, locale, options.heads) : inLayers(m, locale);
  const { boxes, routes, labels, heads } = at;
  const byId = new Map(m.items.map((i) => [i.id, i]));
  const items = at.nodes.flatMap((p): PlacedItem[] => {
    const item = byId.get(p.id);
    const box = boxes.get(p.id);
    if (!item || !box) return [];
    const type = m.types.get(item.type);
    return [{ item, ...(type ? { type } : {}), rect: p.rect, box }];
  });
  const byEdge = new Map(drawn(m).map(([relation, index]) => [edgeId(index), { relation, index }]));
  const lines = routes.flatMap((route): PlacedLine[] => {
    const found = byEdge.get(route.edge);
    const link = found && m.links.get(found.relation.link);
    return found && link ? [{ route, link, ...found }] : [];
  });
  const lineOf = new Map(lines.map((l) => [l.route.edge, l.relation]));
  const related = labels.map((l) => {
    const relation = lineOf.get(routes[l.route]?.edge ?? '');
    return relation === undefined ? l : { ...l, relation };
  });
  const fitted = { width: at.width, bottom: at.bottom };
  const right = Math.max(
    fitted.width,
    ...routes.flatMap((r) => r.points.map(([x]) => x + MARGIN)),
    ...labels.map((l) => l.box.x + l.box.w + MARGIN),
    2 * MARGIN + textWidth(title, F.title),
  );
  const width = Math.ceil(right);
  const bottom = Math.max(fitted.bottom, ...labels.map((l) => l.box.y + l.box.h + MARGIN));
  const entries = (options.legend ? samples(m, heads.length > 0) : []).map((sample) => ({
    sample,
    sampleWidth: LEGEND.sampleWidth,
    labelDx: LEGEND.labelDx,
    text: legendText(sample, locale, w),
  }));
  const legend = legendLayout(entries, bottom + LEGEND_GAP - MARGIN, width);
  return {
    items,
    lines,
    labels: related,
    legend,
    heads,
    verbs: at.verbs,
    ...(at.frame ? { frame: at.frame } : {}),
    width,
    height: Math.ceil(entries.length > 0 ? legend.bottom : bottom),
    placed: at.placed,
  };
}
