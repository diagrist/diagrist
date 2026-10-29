import {
  COLORS as c,
  type Font,
  type RoleStyle,
  rule,
  STANDARD_FONTS,
  type Styles,
  standardStyles,
  textRule,
} from '@diagrist/core';
import { PART_ROLES } from '@diagrist/parts';

/** Font roles of matrices besides the standard ones: the heads at the top and the side, and the letters in the cells. */
export const MATRIX_FONTS = {
  ...STANDARD_FONTS,
  top: { size: 11, weight: 600 },
  side: { size: 11 },
  cell: { size: 12, weight: 700 },
} as const satisfies Readonly<Record<string, Font>>;

const F = MATRIX_FONTS;
const one = (...classes: string[]): RoleStyle => ({ classes });

const ROLES: Readonly<Record<string, RoleStyle>> = {
  ...PART_ROLES,
  sheet: one('table-sheet'),
  tableRule: one('table-rule'),
  headRule: one('table-head-rule'),
  band: one('table-band'),
  bandText: one('label-group'),
  top: one('head-top'),
  side: one('head-side'),
  cell: one('cell-text'),
  markFull: one('mark-full'),
  markRing: one('mark-ring'),
  badge: one('badge'),
  badgeText: one('badge-text'),
  noteText: one('label-note'),
};

/**
 * The style table of matrices: the standard look, the cells on white within hairlines, the heads in ink, the letters
 * bold in the mono face of the look and the discs in ink, so a matrix prints in greyscale without losing a value.
 */
export const MATRIX_STYLES: Styles = standardStyles({
  roles: ROLES,
  rules: [
    rule('table-sheet', `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: 1;`),
    rule('table-rule', `fill: none; stroke: ${c.grid}; stroke-width: 1;`),
    rule('table-head-rule', `fill: none; stroke: ${c.stroke}; stroke-width: 1;`),
    rule('table-band', `fill: ${c.fillMuted}; stroke: none;`),
    rule('head-top', textRule(`fill: ${c.stroke};`, F.top)),
    rule('head-side', textRule(`fill: ${c.stroke};`, F.side)),
    rule('cell-text', textRule(`fill: ${c.stroke};`, F.cell)),
    rule('mark-full', `fill: ${c.stroke}; stroke: none;`),
    rule('mark-ring', `fill: ${c.fill}; stroke: ${c.stroke}; stroke-width: 1.5;`),
  ],
  fonts: F,
});
