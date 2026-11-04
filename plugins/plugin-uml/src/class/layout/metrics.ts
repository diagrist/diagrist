import { textWidth } from '@diagrist/core';
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
  /** Room between a package and its classes at the sides and the bottom. */
  packageSide: 24,
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

/**
 * The measures the layered pipeline of `layout-grid` lays a class diagram out with: gaps between classes, runs into
 * and out of the boxes, tracks and ports 16 apart, names 6 from their line.
 */
export const LAYERED = {
  colGap: 72,
  rowGapMin: 64,
  track: 16,
  portGap: 16,
  lead: 24,
  tail: 16,
  labelGap: 6,
  left: 48,
  top: 128,
} as const;

/** Width of the tab of a package: as wide as its name, at least `tabMinW`. */
export const tabWidth = (label: string): number =>
  Math.max(CLASS.tabMinW, Math.ceil(textWidth(label, CLASS_FONTS.name) + 2 * CLASS.tabPadX));
