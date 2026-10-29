import {
  COLORS as c,
  DASH,
  MARKER_SHAPES,
  type Marker,
  type RoleStyle,
  rule,
  STROKES,
  type Styles,
  standardStyles,
  textRule,
} from '@diagrist/core';
import { PART_ROLES } from '@diagrist/parts';
import { HEADS, type HeadName, LINES, type LineName } from '../declarations.js';
import { GRAPH_FONTS as F } from './layout/metrics.js';

const one = (...classes: string[]): RoleStyle => ({ classes });

/** The marker at the second item for each head; `none` has none. */
const HEAD_MARKERS: Readonly<Record<HeadName, string | undefined>> = {
  arrow: 'filled',
  open: 'open',
  triangle: 'hollow',
  diamond: 'diamond',
  none: undefined,
};

/** The classes of each line form. */
const LINE_CLASSES: Readonly<Record<LineName, readonly string[]>> = {
  solid: ['line'],
  dashed: ['line', 'dashed'],
  dotted: ['line', 'dotted'],
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

const ROLES: Readonly<Record<string, RoleStyle>> = {
  ...PART_ROLES,
  ...LINE_ROLES,
  item: one('shape'),
  itemPlanned: one('shape', 'dashed'),
  itemDeprecated: one('shape-muted', 'dashed'),
  itemDetail: one('item-detail'),
  itemRule: one('item-rule'),
  name: one('label-bold'),
  entry: one('item-entry'),
  edgeLabel: one('label', 'halo'),
  head: one('label-group'),
  verb: one('label'),
  headRule: one('head-rule'),
};

/** Hollow heads for broader terms and wholes, filled with the canvas so the line ends at their outline. */
const MARKERS: readonly Marker[] = [
  { id: 'hollow', shape: MARKER_SHAPES.triangle, name: 'arrow-hollow' },
  { id: 'diamond', shape: MARKER_SHAPES.diamond, name: 'arrow-hollow' },
];

/**
 * The style table of graph pictures: the standard look, items as white shapes in ink, planned ones dashed and
 * deprecated ones muted, the entries in the note colour, and the lines in ink with the heads of their links.
 */
export const GRAPH_STYLES: Styles = (() => {
  const base = standardStyles({
    roles: ROLES,
    rules: [
      rule('dotted', 'stroke-dasharray: 1.5 3; stroke-linecap: round;'),
      rule('arrow-hollow', `fill: ${c.canvas}; stroke: ${c.stroke}; stroke-width: ${STROKES.line};`, true),
      rule('item-detail', `fill: none; stroke: ${c.stroke}; stroke-width: ${STROKES.shape};`),
      rule('item-rule', `fill: none; stroke: ${c.grid}; stroke-width: 1; stroke-dasharray: ${DASH.frame};`),
      rule('item-entry', textRule(`fill: ${c.note};`, F.entry)),
      rule('head-rule', `fill: none; stroke: ${c.border}; stroke-width: 1;`),
    ],
    fonts: F,
  });
  return { ...base, markers: [...base.markers, ...MARKERS] };
})();
