import {
  FONT_STACKS,
  type Font,
  MARKER_SHAPES,
  type Marker,
  rule,
  STROKES,
  type StyleRule,
  type Styles,
  standardStyles,
  textRule,
} from '@diagrist/core';
import { ICONS } from '../../icons/index.js';
import type { Metrics } from '../../layout/metrics.js';
import { ARCHITECTURE_ROLES } from '../../styles/roles.js';
import { architectureRules } from '../../styles/rules.js';
import { LABEL_FONT } from './metrics.js';
import { COLUMNS_ROLES, INK as c } from './roles.js';

/** Every arrowhead an open angle, black on focus and plain lines, grey on context. */
const MARKERS: readonly Marker[] = [
  { id: 'open', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'filled', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'open-accent', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'filled-accent', shape: MARKER_SHAPES.hook, name: 'arrow-open' },
  { id: 'context', shape: MARKER_SHAPES.hook, name: 'arrow-context' },
];

const regular = (f: Font): Font => {
  const { weight: _, ...rest } = f;
  return rest;
};

/** The rules of `look=columns`; a rule with the name of a standard one replaces it, the rest are its own. */
function columnsRules({ fonts: f }: Metrics): StyleRule[] {
  const line = (color: string, width: number) => `fill: none; stroke: ${color}; stroke-width: ${width};`;
  const area = (fill: string, stroke: string, width: number) =>
    `fill: ${fill}; stroke: ${stroke}; stroke-width: ${width};`;
  const text = (color: string, font: Font) => textRule(`fill: ${color};`, font);
  return [
    rule('line', line(c.ink, 2)),
    rule('line-accent', line(c.ink, 2)),
    rule('line-data', line(c.ink, 3)),
    rule('line-data-accent', line(c.ink, 3)),
    rule('line-context', line(c.context, 2)),
    rule('line-data-context', line(c.context, 3)),
    rule('dashed', 'stroke-dasharray: 6 4;'),
    rule('arrow-open', `${line(c.ink, 1.6)} stroke-linejoin: miter;`),
    rule('arrow-context', `${line(c.context, 1.6)} stroke-linejoin: miter;`),
    rule('halo', `paint-order: stroke; stroke: ${c.ground}; stroke-width: 6px; stroke-linejoin: miter;`),
    rule('col-box', area(c.ground, c.ink, 1.5)),
    rule('col-box-focus', area(c.ground, c.accent, 2)),
    rule('col-box-planned', area(c.okFill, c.ok, 1.5)),
    rule('col-box-deprecated', area(c.errorFill, c.error, 1.5)),
    rule('col-box-context', area(c.ground, c.context, 1.5)),
    rule('col-gap', `fill: ${c.ground}; stroke: none;`),
    rule('col-person', `fill: ${c.step}; stroke: none;`),
    rule('col-person-context', `fill: ${c.stepContext}; stroke: none;`),
    rule('col-zone', `${line(c.context, 1.5)} stroke-dasharray: 4 4;`),
    rule('col-zone-title', text(c.grey, f.title)),
    rule('col-zone-team', text(c.grey, f.note)),
    rule('col-band', `fill: ${c.band}; stroke: none;`),
    rule('col-band-title', text(c.ink, f.title)),
    rule('col-band-subtitle', text(c.grey, regular(f.title))),
    rule('col-separator', `${line(c.accent, 2)} stroke-linecap: round; stroke-dasharray: 0.1 6;`),
    rule('label-bold', text(c.ink, f.name)),
    rule('col-name-context', text(c.contextText, f.name)),
    rule('label-description', text(c.grey, f.description)),
    rule('label-tech', text(c.grey, f.tech)),
    rule('col-description-context', text(c.contextText, f.description)),
    rule('col-tech-context', text(c.contextText, f.tech)),
    rule('col-verb', text(c.ink, LABEL_FONT)),
    rule('col-words', text(c.ink, regular(LABEL_FONT))),
    rule('col-verb-context', text(c.contextText, LABEL_FONT)),
    rule('col-words-context', text(c.contextText, regular(LABEL_FONT))),
    rule('col-number', `fill: ${c.ink}; stroke: none;`),
    rule('col-number-context', `fill: ${c.context}; stroke: none;`),
    rule('badge-text', text(c.ground, f.badge)),
    rule('col-mark', area(c.ground, c.ink, 1)),
    rule('mark-text', text(c.ink, f.mark)),
    rule('col-panel', text(c.ink, f.note)),
    rule('col-panel-question', text(c.ink, LABEL_FONT)),
    rule('col-panel-muted', text(c.grey, f.note)),
    rule('col-panel-context', text(c.contextText, f.note)),
    rule('col-footer-title', text(c.ink, f.group)),
    rule('col-footer', text(c.grey, f.group)),
    rule('note-box', `${area(c.ground, c.grey, 1)} stroke-dasharray: 4 3;`),
    rule('note-tail', `${line(c.grey, 1)} stroke-dasharray: 4 3;`),
    rule('label-note', text(c.grey, f.note)),
  ];
}

/**
 * The style table of `look=columns`: the C4 table of the standard look with the columns roles and rules laid over
 * it, the root in unkerned Inter (ADR 0022), open angled heads, and only the rules a picture uses.
 */
export function columnsStyles(m: Metrics): Styles {
  const base = standardStyles({
    roles: { ...ARCHITECTURE_ROLES, ...COLUMNS_ROLES },
    rules: architectureRules(m.fontSize, { ...STROKES, data: 3 }),
    fonts: m.fonts,
  });
  const own = columnsRules(m);
  const replaced = new Map(own.map((r) => [r.name, r]));
  const known = new Set(base.rules.map((r) => r.name));
  const rules = base.rules.map(({ name, declarations }) => replaced.get(name) ?? { name, declarations });
  return {
    ...base,
    fontFamily: FONT_STACKS.inter,
    fontKerning: 'none',
    fontSize: m.fontSize.note,
    canvas: c.ground,
    markerSize: m.markerSize,
    markers: MARKERS,
    rules: [...rules, ...own.filter((r) => !known.has(r.name))],
    icons: ICONS,
  };
}
