import { type Placed, type Rect, textWidth } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import {
  type EdgeLabel,
  fitFrames,
  labelEdges,
  placedOf,
  placeGrid,
  type Route,
  routeEdges,
} from '@diagrist/layout-grid';
import { LEGEND, type Legend, legendLayout, MARGIN } from '@diagrist/parts';
import type { LinkDecl, TypeDecl } from '../../declarations.js';
import type { Graph, GraphWords, Item, Relation } from '../model.js';
import type { TypeTone } from '../palette.js';
import { tonesOf } from './columns.js';
import { type PlacedHead, placeHeads } from './heads.js';
import { GRAPH_FONTS as F, type ItemBox } from './metrics.js';
import { drawn, edgeId, graphGrid } from './spec.js';

/** What the legend shows a sample of: a type with its shape, a link with its line and head, or a status. */
export type Sample =
  | { readonly kind: 'type'; readonly type: TypeDecl }
  | { readonly kind: 'link'; readonly link: LinkDecl }
  | { readonly kind: 'status'; readonly status: 'planned' | 'deprecated' };

/** An item in the picture: where it stands, how it is drawn, and its texts. */
export interface PlacedItem {
  readonly item: Item;
  readonly type?: TypeDecl;
  readonly rect: Rect;
  readonly box: ItemBox;
  /** The tone of its type's bar, in a picture in columns. */
  readonly tone?: TypeTone;
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
  readonly labels: readonly EdgeLabel[];
  readonly legend: Legend<Sample>;
  /** The heads above the columns, each centred on its column with a rule as wide as the column below it. */
  readonly heads: readonly PlacedHead[];
  /** The verbs between the heads, each standing for every line between its two columns. */
  readonly verbs: readonly PlacedHead[];
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
  return [
    ...[...m.types.values()].filter((t) => types.has(t.id) && !headed).map((type): Sample => ({ kind: 'type', type })),
    ...[...m.links.values()]
      .filter((l) => links.has(l.id) && (l.bare || !headed))
      .map((link): Sample => ({ kind: 'link', link })),
    ...statuses.map((status): Sample => ({ kind: 'status', status })),
  ];
}

const legendText = (s: Sample, locale: Locale, w: GraphWords): string =>
  s.kind === 'type' ? s.type.label[locale] : s.kind === 'link' ? s.link.label[locale] : w.status[s.status];

/** Placed, routed and labelled; a second time with room on the left when a label stands left of the margin. */
function placed(m: Graph, locale: Locale, headed: boolean, indent = 0) {
  const at = graphGrid(m, locale, indent, headed);
  const grid = placeGrid(at.spec);
  const routes = routeEdges(at.spec, grid);
  const labels = labelEdges(at.spec, grid, routes, at.texts);
  const left = Math.min(MARGIN, ...labels.map((l) => l.box.x));
  if (left < MARGIN && indent === 0) return placed(m, locale, headed, Math.ceil((MARGIN - left) / 8) * 8);
  return { ...at, grid, routes, labels };
}

/**
 * Lays out a graph picture on `layout-grid`: items measured and layered, placed in an adaptive grid, lines routed
 * and labelled, then the heads of the columns and the legend of what the picture does not say itself, unless
 * `options` leave them out.
 */
export function layoutGraph(
  m: Graph,
  w: GraphWords,
  title: string,
  locale: Locale,
  options: { readonly legend: boolean; readonly heads: boolean } = { legend: true, heads: true },
): GraphLayout {
  const { spec, boxes, grid, routes, labels, heads: named, verbs } = placed(m, locale, options.heads);
  const fitted = fitFrames(spec, grid, routes, labels);
  const row = placeHeads(fitted, named, verbs);
  const heads = row.heads;
  const byId = new Map(m.items.map((i) => [i.id, i]));
  const tones = tonesOf(m);
  const items = fitted.nodes.flatMap((p): PlacedItem[] => {
    const item = byId.get(p.id);
    const box = boxes.get(p.id);
    if (!item || !box) return [];
    const type = m.types.get(item.type);
    const tone = tones.get(item.type);
    return [{ item, ...(type ? { type } : {}), ...(tone ? { tone } : {}), rect: p.rect, box }];
  });
  const byEdge = new Map(drawn(m).map(([relation, index]) => [edgeId(index), { relation, index }]));
  const lines = routes.flatMap((route): PlacedLine[] => {
    const at = byEdge.get(route.edge);
    const link = at && m.links.get(at.relation.link);
    return at && link ? [{ route, link, ...at }] : [];
  });
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
    labels,
    legend,
    heads,
    verbs: row.verbs,
    width,
    height: Math.ceil(entries.length > 0 ? legend.bottom : bottom),
    placed: [...placedOf(spec, fitted, routes, labels), ...row.placed],
  };
}
