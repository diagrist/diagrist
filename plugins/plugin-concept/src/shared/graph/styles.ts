import {
  MARKER_SHAPES,
  type Marker,
  type RoleStyle,
  rule,
  type Styles,
  standardStyles,
  textRule,
} from '@diagrist/core';
import { PART_ROLES } from '@diagrist/parts';
import { HEADS, type HeadName, LINES, type LineName } from '../declarations.js';
import { GRAPH_FONTS as F } from './layout/metrics.js';
import { INK, TYPE_TONE_NAMES, TYPE_TONES } from './palette.js';

const one = (...classes: string[]): RoleStyle => ({ classes });

/** The marker at the second item for each head; `none` has none. */
const HEAD_MARKERS: Readonly<Record<HeadName, string | undefined>> = {
  arrow: 'g-filled',
  open: 'g-open',
  triangle: 'g-hollow',
  diamond: 'g-diamond',
  none: undefined,
};

/** The classes of each line form. */
const LINE_CLASSES: Readonly<Record<LineName, readonly string[]>> = {
  solid: ['g-line'],
  dashed: ['g-line', 'g-dashed'],
  dotted: ['g-line', 'g-dotted'],
};

/** Role of a line drawn in `line` form with `head`, such as `line-dashed-open`. */
export const lineRole = (line: LineName, head: HeadName): string => `line-${line}-${head}`;

const LINE_ROLES: Readonly<Record<string, RoleStyle>> = Object.fromEntries(
  LINES.flatMap((line) =>
    HEADS.map((head) => {
      const marker = HEAD_MARKERS[head];
      return [lineRole(line, head), { classes: LINE_CLASSES[line], ...(marker ? { marker } : {}) }] as const;
    }),
  ),
);

/** The card of an item in the tone of its type. */
const TONE_ROLES: Readonly<Record<string, RoleStyle>> = Object.fromEntries(
  TYPE_TONE_NAMES.map((t) => [`card-${t}`, one(`g-card-${t}`)]),
);

const ROLES: Readonly<Record<string, RoleStyle>> = {
  ...PART_ROLES,
  ...LINE_ROLES,
  ...TONE_ROLES,
  title: one('g-title'),
  subtitle: one('g-subtitle'),
  item: one('g-item'),
  itemPlanned: one('g-item', 'g-dashed'),
  itemDeprecated: one('g-item-muted', 'g-dashed'),
  itemDetail: one('g-detail'),
  itemRule: one('g-rule'),
  name: one('g-name'),
  lead: one('g-lead'),
  heading: one('g-heading'),
  entry: one('g-entry'),
  edgeLabel: one('g-label', 'halo'),
  head: one('g-head'),
  verb: one('g-verb'),
  legendRule: one('g-rule'),
  legendText: one('g-entry'),
};

/** Heads of the lines in their grey, smaller than the standard ones; hollow heads filled with the canvas. */
const MARKERS: readonly Marker[] = [
  { id: 'g-filled', shape: MARKER_SHAPES.triangle, name: 'g-arrow' },
  { id: 'g-open', shape: MARKER_SHAPES.hook, name: 'g-arrow-open' },
  { id: 'g-hollow', shape: MARKER_SHAPES.triangle, name: 'g-arrow-hollow' },
  { id: 'g-diamond', shape: MARKER_SHAPES.diamond, name: 'g-arrow-hollow' },
];

/**
 * The style table of graph pictures, in the sans face. Contrast leads the eye: the first column's names darkest and
 * strongest, the cards of the other columns pale tints without a border and their names a step lighter, the heads
 * and verbs above them quiet, and the lines a light grey with small heads that join without drawing attention.
 */
export const GRAPH_STYLES: Styles = (() => {
  const base = standardStyles({
    roles: ROLES,
    rules: [
      rule('g-title', textRule(`fill: ${INK.name};`, F.title)),
      rule('g-subtitle', textRule(`fill: ${INK.muted};`, F.note)),
      rule('g-item', `fill: ${INK.fill}; stroke: ${INK.border}; stroke-width: 1;`),
      rule('g-item-muted', `fill: ${INK.soft}; stroke: ${INK.quiet}; stroke-width: 1;`),
      rule('g-detail', `fill: none; stroke: ${INK.quiet}; stroke-width: 1;`),
      rule('g-rule', `fill: none; stroke: ${INK.border}; stroke-width: 1;`),
      rule('g-name', textRule(`fill: ${INK.text};`, F.name)),
      rule('g-lead', textRule(`fill: ${INK.name};`, F.lead)),
      rule('g-heading', textRule(`fill: ${INK.name};`, F.heading)),
      rule('g-entry', textRule(`fill: ${INK.muted};`, F.entry)),
      rule('g-label', textRule(`fill: ${INK.muted};`, F.label)),
      rule('g-head', textRule(`fill: ${INK.muted};`, F.head)),
      rule('g-verb', textRule(`fill: ${INK.quiet};`, F.label)),
      rule('g-line', `fill: none; stroke: ${INK.line}; stroke-width: 1;`),
      rule('g-dashed', 'stroke-dasharray: 5 4;'),
      rule('g-dotted', 'stroke-dasharray: 1.5 3; stroke-linecap: round;'),
      rule('g-arrow', `fill: ${INK.line}; stroke: none;`, true),
      rule('g-arrow-open', `fill: none; stroke: ${INK.line}; stroke-width: 1;`, true),
      rule('g-arrow-hollow', `fill: ${INK.fill}; stroke: ${INK.line}; stroke-width: 1;`, true),
      ...TYPE_TONE_NAMES.map((t) => rule(`g-card-${t}`, `fill: ${TYPE_TONES[t].tint}; stroke: none;`)),
    ],
    fonts: F,
  });
  return { ...base, markerSize: 8, markers: [...base.markers, ...MARKERS] };
})();
