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
const STANDARD_AREA_COLORS: AreaColors = { ink: [COLORS.stroke], outline: [COLORS.border], surface: [COLORS.fill] };

type AreaColors = NonNullable<Styles['areaColors']>;

const DECLARATION = /^\s*(fill|stroke)\s*:\s*(\S+?)\s*$/;

/** One painting declaration of a rule inside an area, and whether the area changed it. */
interface Painted {
  readonly prop: string;
  readonly value: string;
  readonly changed: boolean;
}

/** The fill and stroke of a rule as an area paints them, each marked when the area replaced it; the stripe as a filter. */
function derive(declarations: string, mark: AreaMark, paint: AreaPaint, colors: AreaColors): Painted[] {
  const { ink, tint } = AREA_TONES[mark.tone];
  const { ink: inks, outline, surface } = colors;
  const mode = mark.as === 'line' ? 'outline' : paint;
  const out: Painted[] = [];
  for (const part of declarations.split(';')) {
    const [, prop, value] = DECLARATION.exec(part) ?? [];
    if (prop === undefined || value === undefined) continue;
    const isInk = inks.includes(value) || (prop === 'stroke' && outline.includes(value));
    const isSurface = prop === 'fill' && surface.includes(value);
    if (isInk && (mode === 'outline' || (mode === 'tint' && prop === 'stroke'))) {
      out.push({ prop, value: ink, changed: true });
    } else if (isSurface && mode === 'tint') {
      out.push({ prop, value: tint, changed: true });
    } else {
      out.push({ prop, value, changed: false });
    }
    if (isSurface && mode === 'stripe') out.push({ prop: 'filter', value: `url(#area-${mark.tone})`, changed: true });
  }
  return out;
}

/** Area classes in a stable order: by tone, lines and frames before the elements, whose rules then win. */
const ordered = (uses: ReadonlyMap<string, AreaUse>): AreaUse[] => {
  const rank = (u: AreaUse) => AREA_TONE_NAMES.indexOf(u.mark.tone) * 2 + (u.mark.as === 'line' ? 0 : 1);
  return [...uses.values()].sort((a, b) => rank(a) - rank(b));
};

/** What SVG paints a shape with when its class has no rule in the stylesheet: a black fill. */
const UNSTYLED = 'fill: #000000;';

/**
 * CSS rules of the areas: each rule of the style table used inside an area, repainted in the area's tone. The rules
 * repeat, in their order, what the other classes used there paint of the same property, so that a shape of two
 * classes, such as a line with a halo, is painted inside the area as outside: the halo keeps the canvas. A rule the
 * stylesheet leaves out, as looks do that write only what the picture uses, paints nothing, so its class is drawn in
 * SVG's black fill, which the area repaints like ink; that keeps arrowheads in the tone of their line.
 */
export function areaRules(
  styles: Styles,
  uses: ReadonlyMap<string, AreaUse>,
  paint: AreaPaint,
  written: ReadonlySet<string>,
): string[] {
  const root = `.${styles.root}`;
  const colors = styles.areaColors ?? STANDARD_AREA_COLORS;
  const unstyled = { ...colors, ink: [...colors.ink, '#000000'] };
  return ordered(uses).flatMap((use) => {
    const rules = styles.rules
      .filter((rule) => use.classes.has(rule.name))
      .map((rule) => {
        const own = written.has(rule.name);
        return {
          name: rule.name,
          painted: derive(own ? rule.declarations : UNSTYLED, use.mark, paint, own ? colors : unstyled),
        };
      });
    const changed = new Set(rules.flatMap((r) => r.painted.filter((d) => d.changed).map((d) => d.prop)));
    return rules
      .map(({ name, painted }) => ({ name, kept: painted.filter((d) => d.changed || changed.has(d.prop)) }))
      .filter(({ kept }) => kept.length > 0)
      .map(({ name, kept }) => {
        const declarations = kept.map((d) => `${d.prop}: ${d.value};`).join(' ');
        return `  ${root} .${areaClass(use.mark)} .${name} { ${declarations} }\n`;
      });
  });
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
