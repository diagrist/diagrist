import { markerElement } from '../markers.js';
import { COLORS } from '../standard/palette.js';
import type { Styles } from '../styles.js';
import { AREA_TONE_NAMES, AREA_TONES, type AreaMark, type AreaPaint, type AreaTone } from './tones.js';

/** The class a group of an area carries: `area-<tone>` for an element, `area-<tone>-line` for a line or a frame. */
export const areaClass = (mark: AreaMark): string =>
  mark.as === 'line' ? `area-${mark.tone}-line` : `area-${mark.tone}`;

/** What the SVG writer found below the groups of one area class: the mark, the classes and the markers used there. */
export interface AreaUse {
  readonly mark: AreaMark;
  readonly classes: Set<string>;
  readonly markers: Set<string>;
}

/** The colours a style table paints in ink and as the fill of an element, which the areas replace. */
const STANDARD_AREA_COLORS = { ink: [COLORS.stroke, COLORS.border], surface: [COLORS.fill] } as const;

const DECLARATION = /^\s*(fill|stroke)\s*:\s*(\S+?)\s*$/;

/** The declarations an area adds to a rule of the style table, or none when the rule paints nothing it replaces. */
function derive(declarations: string, mark: AreaMark, paint: AreaPaint, colors: Styles['areaColors']): string {
  const { ink, tint } = AREA_TONES[mark.tone];
  const { ink: inks, surface } = colors ?? STANDARD_AREA_COLORS;
  const mode = mark.as === 'line' ? 'outline' : paint;
  const out: string[] = [];
  for (const part of declarations.split(';')) {
    const [, prop = '', value = ''] = DECLARATION.exec(part) ?? [];
    const isInk = inks.includes(value);
    const isSurface = prop === 'fill' && surface.includes(value);
    if (isInk && (mode === 'outline' || (mode === 'tint' && prop === 'stroke'))) out.push(`${prop}: ${ink};`);
    if (isSurface && mode === 'tint') out.push(`fill: ${tint};`);
    if (isSurface && mode === 'stripe') out.push(`filter: url(#area-${mark.tone});`);
  }
  return out.join(' ');
}

/** Area classes in a stable order: by tone, lines and frames before the elements, whose rules then win. */
const ordered = (uses: ReadonlyMap<string, AreaUse>): AreaUse[] => {
  const rank = (u: AreaUse) => AREA_TONE_NAMES.indexOf(u.mark.tone) * 2 + (u.mark.as === 'line' ? 0 : 1);
  return [...uses.values()].sort((a, b) => rank(a) - rank(b));
};

/** CSS rules of the areas: each rule of the style table used inside an area, repainted in the area's tone. */
export function areaRules(styles: Styles, uses: ReadonlyMap<string, AreaUse>, paint: AreaPaint): string[] {
  const root = `.${styles.root}`;
  return ordered(uses).flatMap((use) =>
    styles.rules
      .filter((rule) => use.classes.has(rule.name))
      .map((rule) => [rule.name, derive(rule.declarations, use.mark, paint, styles.areaColors)] as const)
      .filter(([, declarations]) => declarations !== '')
      .map(([name, declarations]) => `  ${root} .${areaClass(use.mark)} .${name} { ${declarations} }\n`),
  );
}

/**
 * The stripe of a tone: the shape's own outline moved right by the stripe's width and cut from the shape, which leaves
 * a band along the inside of its left edge, filled with the ink and laid over the shape. The band stays inside the
 * outline, so the shape keeps the edge the layout measured and the arrowheads that end on it, on every side.
 */
const stripeFilter = (tone: AreaTone): string =>
  `<filter id="area-${tone}" x="-0.1" y="-0.1" width="1.2" height="1.2"><feOffset in="SourceAlpha" dx="${STRIPE}" dy="0" result="moved"/><feComposite in="SourceAlpha" in2="moved" operator="out" result="band"/><feFlood flood-color="${AREA_TONES[tone].ink}"/><feComposite in2="band" operator="in" result="stripe"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="stripe"/></feMerge></filter>`;

/** Width of the stripe in pixels, the outline of the shape included. */
const STRIPE = 6;

/** The `<defs>` the areas need: a copy of each marker used on their lines, and the stripe filter of each tone. */
export function areaDefs(styles: Styles, uses: ReadonlyMap<string, AreaUse>, paint: AreaPaint): string {
  const out: string[] = [];
  const striped = new Set<AreaTone>();
  for (const use of ordered(uses)) {
    const { tone } = use.mark;
    for (const marker of styles.markers.filter((m) => use.markers.has(m.id))) {
      out.push(markerElement(marker, styles.markerSize, tone, areaClass({ tone, as: 'line' })));
    }
    if (paint === 'stripe' && use.mark.as === 'body') striped.add(tone);
  }
  for (const tone of AREA_TONE_NAMES.filter((t) => striped.has(t))) {
    out.push(stripeFilter(tone));
  }
  return out.join('');
}
