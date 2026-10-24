import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { GridMetrics } from '@diagrist/layout-grid';
import { UML_BOX_FONTS } from '../../shared/box-styles.js';

/** Font roles of class diagrams: those of every UML box. Layout measures with them, the style table sets them. */
export const CLASS_FONTS = UML_BOX_FONTS;

/**
 * Measures of class diagrams in pixels, as the predecessor drew them after the learning platform: the box, its head
 * and compartments, end texts, packages with their tab, the x of a non-navigable end, template parameters and the
 * diamond of an n-ary association.
 */
export const CLASS = {
  grid: 8,
  minW: 160,
  padX: 10,
  headPad: 7,
  stereoH: 13,
  nameH: 15,
  sectionPad: 5,
  memberH: 16,
  emptyH: 10,
  underline: 2,
  /**
   * Room the end symbols take along the line, as the predecessor drew them: triangle, diamond, open head. End texts
   * keep behind it; the scene draws the kernel's markers, which are shorter (docs/burn-down.md).
   */
  triangle: 14,
  diamond: 16,
  arrow: 10,
  endGap: 4,
  endAside: 5,
  /** Gap between neighbouring classes on one row, at least. */
  colGap: 136,
  loopReach: 32,
  tabH: 22,
  tabMinW: 72,
  tabPadX: 10,
  packagePad: 28,
  crossAt: 11,
  crossArm: 5,
  templateH: 20,
  templatePadX: 6,
  templateOver: 12,
  naryW: 36,
  naryH: 24,
  naryNameGap: 4,
  /** Classes side by side in one layer before it wraps. */
  perLayer: 5,
} as const;

/** The measures `layout-grid` lays a class diagram out with: adaptive columns, orthogonal lines. */
export const classMetrics = (colGap: number, packages: boolean): GridMetrics => ({
  grid: CLASS.grid,
  nodeW: 192,
  nodeH: 56,
  colGap,
  subColGap: 104,
  rowGap: 120,
  marginX: 48,
  firstRowY: 128,
  margin: 32,
  laneGap: 16,
  portSpread: 16,
  loopReach: CLASS.loopReach,
  framePad: packages ? { top: CLASS.tabH + CLASS.packagePad, bottom: 24, x: 24 } : { top: 56, bottom: 24, x: 24 },
  labelFont: STANDARD_FONTS.label,
  labelLineH: 12,
  labelGap: 10,
});

/** Width of the tab of a package: as wide as its name, at least `tabMinW`. */
export const tabWidth = (label: string): number =>
  Math.max(CLASS.tabMinW, Math.ceil(textWidth(label, CLASS_FONTS.name) + 2 * CLASS.tabPadX));
