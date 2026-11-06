import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import { type LayeredEdge, type LayeredLayout, layoutLayered, WRAP_EM, wrapWithin } from '@diagrist/layout-grid';
import { MARGIN } from '@diagrist/parts';
import type { Graph } from '../model.js';
import { arrangementOf, coreArea } from './arrangement.js';
import { edgeId, edgesOf } from './edges.js';
import { linesAlike } from './lines.js';
import { FIRST_ROW, GAP, type ItemBox, measureItem } from './metrics.js';

/** The measures of a layered graph picture: the gaps of the standard look, two arrowheads of run into a head. */
const METRICS = { colGap: GAP.col, rowGapMin: 56, track: 16, portGap: 16, lead: 24, tail: 16, labelGap: 6 } as const;

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
function labelOf(word: string) {
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
}

/**
 * The items and relations of a graph as a layered picture (plan L3): `upward` links turn the layers, `beside`
 * links stay in one and pull lightly where they cannot, relations of one link and one area without their own text
 * may share a trunk, those with dashes or dots only out of one item, where the dashes of all start together, and
 * give way to solid ones as soft lines; items of one area keep together where that costs no crossing.
 */
export function layeredGraph(m: Graph, locale: Locale): LayeredGraph {
  const boxes = new Map(
    m.items.map((i) => [i.id, measureItem(i.label, i.entries, m.types.get(i.type)?.shape === 'person')] as const),
  );
  const relations = edgesOf(m);
  const alike = linesAlike(m);
  const areaOf = new Map(m.items.map((i) => [i.id, i.area]));
  const edges = relations.map(([r, i]): LayeredEdge => {
    const link = m.links.get(r.link);
    const word = wordOf(m, r.label, r.link, alike, locale);
    const area = r.area ?? areaOf.get(r.from) ?? '';
    return {
      id: edgeId(i),
      from: r.from,
      to: r.to,
      rank: link?.beside === true ? 0 : link?.upward === true ? -1 : 1,
      ...(link?.beside === true ? { weight: 0.5 } : {}),
      ...(link !== undefined && link.line !== 'solid' ? { strength: 'soft' as const } : {}),
      ...(r.label === undefined ? { bundle: `${r.link}|${area}${link?.line === 'solid' ? '' : `|${r.from}`}` } : {}),
      ...(word === undefined ? {} : { label: labelOf(word) }),
      source: r.span,
    };
  });
  const top = m.subtitle ? FIRST_ROW.subtitle : FIRST_ROW.title;
  const core = arrangementOf(m) === 'hub' ? coreArea(m) : undefined;
  const head = STANDARD_FONTS.group;
  const hub = core && {
    core: m.items.filter((i) => i.area === core.id).map((i) => i.id),
    head: { text: core.label, width: textWidth(core.label, head), size: head.size },
    pad: 16,
  };
  const layout = layoutLayered({
    nodes: m.items.map((i) => {
      const box = boxes.get(i.id);
      return {
        id: i.id,
        width: box?.w ?? 0,
        height: box?.h ?? 0,
        ...(i.area === undefined ? {} : { cluster: i.area }),
        source: i.span,
      };
    }),
    edges,
    metrics: { ...METRICS, left: MARGIN, top },
    ...(hub ? { hub } : {}),
  });
  return { layout, boxes };
}
