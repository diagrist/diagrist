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
import type { LinkDecl, TypeDecl } from '../declarations.js';
import type { ConceptModel, Item, Relation } from '../model.js';
import type { ConceptWords } from '../texts/words.js';
import { CONCEPT_FONTS as F, type ItemBox } from './metrics.js';
import { conceptGrid, drawn, edgeId } from './spec.js';

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
export interface ConceptLayout {
  readonly items: readonly PlacedItem[];
  readonly lines: readonly PlacedLine[];
  readonly labels: readonly EdgeLabel[];
  readonly legend: Legend<Sample>;
  readonly width: number;
  readonly height: number;
  readonly placed: readonly Placed[];
}

/** Room between the content and the legend below it. */
const LEGEND_GAP = 40;

/** The legend's samples: the types, links and statuses the picture uses, in the order of their declarations. */
function samples(m: ConceptModel): Sample[] {
  const types = new Set(m.items.map((i) => i.type));
  const links = new Set(drawn(m).map(([r]) => r.link));
  const statuses = (['planned', 'deprecated'] as const).filter((s) => m.items.some((i) => i.status === s));
  return [
    ...[...m.types.values()].filter((t) => types.has(t.id)).map((type): Sample => ({ kind: 'type', type })),
    ...[...m.links.values()].filter((l) => links.has(l.id)).map((link): Sample => ({ kind: 'link', link })),
    ...statuses.map((status): Sample => ({ kind: 'status', status })),
  ];
}

const legendText = (s: Sample, locale: Locale, w: ConceptWords): string =>
  s.kind === 'type' ? s.type.label[locale] : s.kind === 'link' ? s.link.label[locale] : w.status[s.status];

/**
 * Lays out a concept picture on `layout-grid`: items measured and layered, placed in an adaptive grid, lines routed
 * and labelled, then the legend of what the picture uses below it.
 */
export function layoutConcept(m: ConceptModel, w: ConceptWords, title: string, locale: Locale): ConceptLayout {
  const { spec, texts, boxes } = conceptGrid(m, locale);
  const grid = placeGrid(spec);
  const routes = routeEdges(spec, grid);
  const labels = labelEdges(spec, grid, routes, texts);
  const fitted = fitFrames(spec, grid, routes, labels);
  const byId = new Map(m.items.map((i) => [i.id, i]));
  const items = fitted.nodes.flatMap((p): PlacedItem[] => {
    const item = byId.get(p.id);
    const box = boxes.get(p.id);
    if (!item || !box) return [];
    const type = m.types.get(item.type);
    return [{ item, ...(type ? { type } : {}), rect: p.rect, box }];
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
  const entries = samples(m).map((sample) => ({
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
    width,
    height: Math.ceil(entries.length > 0 ? legend.bottom : bottom),
    placed: placedOf(spec, fitted, routes, labels),
  };
}
