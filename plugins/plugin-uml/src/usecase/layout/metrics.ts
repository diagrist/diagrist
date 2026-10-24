import { type Font, STANDARD_FONTS } from '@diagrist/core';
import type { GridMetrics } from '@diagrist/layout-grid';

/** Font roles of use case diagrams: layout measures with them, the style table sets them. */
export const UC_FONTS = {
  ...STANDARD_FONTS,
  ucName: { size: 12 },
  stereo: STANDARD_FONTS.note,
  member: { size: 11 },
} as const satisfies Record<string, Font>;

/**
 * Measures of use cases, actors and notes in pixels, as the predecessor drew them: ellipse minimum and air around
 * the text, line heights, wrapping, the stick figure, gaps of the grid, notes with their folded corner.
 */
export const UC = {
  grid: 8,
  minW: 112,
  minH: 48,
  padX: 16,
  padY: 11,
  /** Added to half the height, so the text keeps off the flat top and bottom of the ellipse. */
  round: 4,
  lineH: 15,
  pointH: 14,
  /** Names longer than this many characters wrap into two lines. */
  wrap: 18,
  /** Air above and below the line over the compartment of extension points. */
  ruleGap: 5,
  actorW: 40,
  actorH: 58,
  actorBoxPad: 12,
  stereoH: 13,
  colGap: 112,
  rowGap: 24,
  endGap: 3,
  notePad: 6,
  noteFold: 8,
  noteGap: 14,
  noteStep: 8,
  /** Notes wrap after this many characters, so the box fits beside an ellipse. */
  noteWrap: 30,
} as const;

/** The measures `layout-grid` lays a use case diagram out with: adaptive columns, straight lines. */
export const UC_GRID: GridMetrics = {
  grid: UC.grid,
  nodeW: 192,
  nodeH: 56,
  colGap: UC.colGap,
  subColGap: 104,
  rowGap: UC.rowGap,
  marginX: 48,
  firstRowY: 128,
  margin: 32,
  laneGap: 16,
  portSpread: 16,
  loopReach: 32,
  framePad: { top: 56, bottom: 24, x: 24 },
  labelFont: STANDARD_FONTS.label,
  labelLineH: 12,
  labelGap: 10,
  endGap: UC.endGap,
};

/** Smallest step of the grid that holds `v`; measured widths are rounded up, a pixel above does not count. */
export const snap = (v: number, grid: number = UC.grid): number => Math.ceil((v - 1) / grid) * grid;
