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

/** Roles of a tone: the bar on an item, the head of a column and the rule below it. */
const TONE_ROLES: Readonly<Record<string, RoleStyle>> = Object.fromEntries(
  TYPE_TONE_NAMES.flatMap((t) => [
    [`bar-${t}`, one(`g-bar-${t}`)],
    [`head-${t}`, one(`g-head-${t}`)],
    [`headRule-${t}`, one(`g-head-rule-${t}`)],
  ]),
);

const ROLES: Readonly<Record<string, RoleStyle>> = {
  ...PART_ROLES,
  ...LINE_ROLES,
  ...TONE_ROLES,
  item: one('g-item'),
  itemPlanned: one('g-item', 'g-dashed'),
  itemDeprecated: one('g-item-muted', 'g-dashed'),
  itemDetail: one('g-detail'),
  itemRule: one('g-rule'),
  name: one('g-name'),
  entry: one('g-entry'),
  edgeLabel: one('g-label', 'halo'),
  head: one('g-head'),
  verb: one('g-label'),
  headRule: one('g-head-rule'),
  legendRule: one('g-head-rule'),
};

/** Heads of the lines in their grey, smaller than the standard ones; hollow heads filled with the canvas. */
const MARKERS: readonly Marker[] = [
  { id: 'g-filled', shape: MARKER_SHAPES.triangle, name: 'g-arrow' },
  { id: 'g-open', shape: MARKER_SHAPES.hook, name: 'g-arrow-open' },
  { id: 'g-hollow', shape: MARKER_SHAPES.triangle, name: 'g-arrow-hollow' },
  { id: 'g-diamond', shape: MARKER_SHAPES.diamond, name: 'g-arrow-hollow' },
];

const head = (paint: string) => textRule(`fill: ${paint};`, F.head);

/**
 * The style table of graph pictures. The items carry the picture: white with a light border and the name dark,
 * entries in grey, a bar in the tone of their type. The lines step back in a mid grey with small heads, and the head
 * row orders it all with the names of the types, small and spaced, in the dark shade of their tone.
 */
export const GRAPH_STYLES: Styles = (() => {
  const base = standardStyles({
    roles: ROLES,
    rules: [
      rule('g-item', `fill: ${INK.fill}; stroke: ${INK.border}; stroke-width: 1;`),
      rule('g-item-muted', `fill: ${INK.soft}; stroke: ${INK.line}; stroke-width: 1;`),
      rule('g-detail', `fill: none; stroke: ${INK.line}; stroke-width: 1.25;`),
      rule('g-rule', `fill: none; stroke: ${INK.hairline}; stroke-width: 1;`),
      rule('g-name', textRule(`fill: ${INK.name};`, F.name)),
      rule('g-entry', textRule(`fill: ${INK.muted};`, F.entry)),
      rule('g-label', textRule(`fill: ${INK.muted};`, F.label)),
      rule('g-line', `fill: none; stroke: ${INK.line}; stroke-width: 1.25;`),
      rule('g-dashed', 'stroke-dasharray: 5 4;'),
      rule('g-dotted', 'stroke-dasharray: 1.5 3; stroke-linecap: round;'),
      rule('g-arrow', `fill: ${INK.line}; stroke: none;`, true),
      rule('g-arrow-open', `fill: none; stroke: ${INK.line}; stroke-width: 1.25;`, true),
      rule('g-arrow-hollow', `fill: ${INK.fill}; stroke: ${INK.line}; stroke-width: 1.25;`, true),
      rule('g-head', head(INK.muted)),
      rule('g-head-rule', `fill: none; stroke: ${INK.border}; stroke-width: 1;`),
      ...TYPE_TONE_NAMES.flatMap((t) => [
        rule(`g-bar-${t}`, `fill: ${TYPE_TONES[t].bar}; stroke: none;`),
        rule(`g-head-${t}`, head(TYPE_TONES[t].text)),
        rule(`g-head-rule-${t}`, `fill: none; stroke: ${TYPE_TONES[t].bar}; stroke-width: 2;`),
      ]),
    ],
    fonts: F,
  });
  return { ...base, markerSize: 9, markers: [...base.markers, ...MARKERS] };
})();
