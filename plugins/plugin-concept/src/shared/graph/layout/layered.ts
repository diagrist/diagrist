import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import {
  type GraphEdge,
  type GraphLabel,
  type LayeredLayout,
  layoutGraph,
  WRAP_EM,
  wrapWithin,
} from '@diagrist/layout-grid';
import { MARGIN } from '@diagrist/parts';
import type { Graph } from '../model.js';
import { arrangementOf, coreArea } from './arrangement.js';
import { busesOf, busGraph, drawBuses } from './bus.js';
import { edgeId, edgesOf } from './edges.js';
import { linesAlike } from './lines.js';
import { FIRST_ROW, GAP, type ItemBox, measureItem } from './metrics.js';

/** The measures of a layered graph picture: the gaps of the standard look, two arrowheads of run into a head. */
export const METRICS = {
  colGap: GAP.col,
  rowGapMin: 56,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 6,
} as const;

/**
 * The words on the lines (plan Q10): a relation's own text always; the word of its link only when two links of the
 * picture look alike (`linesAlike`), since otherwise the legend tells them apart by their line, and never for `bare`
 * links.
 */
function wordOf(m: Graph, label: string | undefined, link: string, alike: boolean, locale: Locale): string | undefined {
  if (label !== undefined) return label;
  const declared = m.links.get(link);
  return declared && !declared.bare && alike ? declared.label[locale] : undefined;
}

/** A word on a line, measured, broken between its words where it runs wider than the wrap of line texts. */
export function labelOf(word: string): GraphLabel {
  const font = STANDARD_FONTS.label;
  const measure = (t: string) => textWidth(t, font);
  const lines = wrapWithin(word, WRAP_EM * font.size, measure).map((text) => ({ text, width: measure(text) }));
  const width = Math.max(...lines.map((l) => l.width));
  return { text: word, width, size: font.size, ...(lines.length > 1 ? { lines } : {}) };
}

/** A layered graph picture laid out, with every item measured. */
export interface LayeredGraph {
  readonly layout: LayeredLayout;
  readonly boxes: ReadonlyMap<string, ItemBox>;
  /** The bus each relation drawn on one runs on, by the id of its edge. */
  readonly buses: ReadonlyMap<string, string>;
}

/**
 * The items and relations of a graph as a layered picture (plan L3): `upward` links turn the layers, `beside`
 * links stay in one and pull lightly where they cannot, relations of one link and one area without their own text
 * may share a trunk, those with dashes or dots only out of one item, where the dashes of all start together, and
 * give way to solid ones as soft lines; items of one area keep together where that costs no crossing. A complete
 * set of relations between two types outside a hub is drawn as a bus (`busesOf`).
 */
export function layeredGraph(m: Graph, locale: Locale): LayeredGraph {
  const boxes = new Map(
    m.items.map((i) => [i.id, measureItem(i.label, i.entries, m.types.get(i.type)?.shape === 'person')] as const),
  );
  const alike = linesAlike(m);
  const core = arrangementOf(m) === 'hub' ? coreArea(m) : undefined;
  const buses = core ? [] : busesOf(m, (r) => wordOf(m, r.label, r.link, alike, locale) !== undefined);
  const onBus = new Map(buses.flatMap((b) => b.relations.map(([, i]) => [edgeId(i), b.id] as const)));
  const relations = edgesOf(m).filter(([, i]) => !onBus.has(edgeId(i)));
  const areaOf = new Map(m.items.map((i) => [i.id, i.area]));
  const laid = buses.map((b) => busGraph(b, m.links.get(b.link)?.line !== 'solid'));
  const edges = relations.map(([r, i]): GraphEdge => {
    const link = m.links.get(r.link);
    const word = wordOf(m, r.label, r.link, alike, locale);
    const area = r.area ?? areaOf.get(r.from) ?? '';
    return {
      id: edgeId(i),
      from: r.from,
      to: r.to,
      rank: link?.beside === true ? 'beside' : link?.upward === true ? 'up' : 'down',
      ...(link?.beside === true ? { weight: 0.5 } : {}),
      ...(link !== undefined && link.line !== 'solid' ? { strength: 'soft' as const } : {}),
      ...(r.label === undefined ? { bundle: `${r.link}|${area}${link?.line === 'solid' ? '' : `|${r.from}`}` } : {}),
      ...(word === undefined ? {} : { label: labelOf(word) }),
      source: r.span,
    };
  });
  const top = m.subtitle ? FIRST_ROW.subtitle : FIRST_ROW.title;
  const head = STANDARD_FONTS.group;
  const hub = core && {
    id: core.id,
    kind: 'core' as const,
    members: m.items.filter((i) => i.area === core.id).map((i) => i.id),
    pad: 16,
    top: 0,
    head: { text: core.label, width: textWidth(core.label, head), height: head.size, size: head.size },
  };
  const layout = layoutGraph({
    nodes: [
      ...m.items.map((i) => {
        const box = boxes.get(i.id);
        return {
          id: i.id,
          width: box?.w ?? 0,
          height: box?.h ?? 0,
          ...(i.area === undefined ? {} : { cluster: i.area }),
          source: i.span,
        };
      }),
      ...laid.map((b) => b.node),
    ],
    edges: [...edges, ...laid.flatMap((b) => b.edges)],
    metrics: { ...METRICS, left: MARGIN, top },
    ...(hub ? { containers: [hub], given: { arrangement: 'hub' as const } } : {}),
  });
  return { layout: drawBuses(layout, buses), boxes, buses: onBus };
}
