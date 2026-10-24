import { STANDARD_FONTS } from '@diagrist/core';
import type { GridMetrics } from '@diagrist/layout-grid';
import { UML_BOX_FONTS } from '../../shared/box-styles.js';

/** Font roles of state machine diagrams: those of every UML box. Layout measures with them, the style table sets them. */
export const STATE_FONTS = UML_BOX_FONTS;

/**
 * Measures of state machine diagrams in pixels, as the predecessor drew them after the learning platform: states at
 * least 120 wide with radius 12, pseudostates a little smaller than there, so they look less important in print.
 */
export const STATE = {
  grid: 8,
  minW: 120,
  padX: 12,
  radius: 12,
  /** Height of a state without compartment, and of the name field with one. */
  nameH: 48,
  headH: 30,
  sectionPad: 5,
  lineH: 15,
  initial: 20,
  final: 26,
  finalDot: 7,
  choice: 28,
  junction: 12,
  history: 26,
  terminate: 20,
  point: 16,
  subW: 22,
  subH: 8,
  subInset: 7,
  regionNameH: 18,
  barMin: 96,
  barH: 6,
  barOverhang: 24,
  pseudoLabelGap: 6,
  labelAir: 16,
  /** Widest line of a transition label; beyond it the label breaks before guard and effect. */
  labelLineW: 168,
  /** Up to this offset a step becomes a straight line; also the distance from corners. */
  step: 16,
  laneGap: 16,
  loopReach: 32,
  labelGap: 10,
  labelLineH: 12,
  /** Air around frames, and the pads of a composite state below its head. */
  padBottom: 24,
  padSide: 24,
  marginX: 48,
  margin: 32,
  labelDy: 4,
} as const;

/**
 * What a place costs an entry or exit point besides the length of its ways, in pixels of that length. A place that
 * costs `taken` or more is given up when the point is placed as one end of a straight pair.
 */
export const POINT_PENALTY = {
  /** In the middle of the top of a composite state, on its name. */
  title: 500,
  /** At the bottom of the right side of a submachine state, on its icon. */
  icon: 500,
  /** Closer than three point widths to a point placed before. */
  taken: 2000,
  /** A pair that bends through the gap instead of running straight across. */
  bend: 100,
  /** Added per further way round of a bending pair, so the first one wins a tie. */
  bendNext: 10,
} as const;

/** The measures `layout-grid` lays a state machine diagram out with: adaptive columns, orthogonal lines. */
export const stateMetrics = (colGap: number): GridMetrics => ({
  grid: STATE.grid,
  nodeW: 192,
  nodeH: 56,
  rowMin: 0,
  colGap,
  subColGap: 104,
  rowGap: 120,
  marginX: STATE.marginX,
  firstRowY: 128,
  margin: STATE.margin,
  laneGap: STATE.laneGap,
  portSpread: 16,
  loopReach: STATE.loopReach,
  framePad: { top: 56, bottom: STATE.padBottom, x: STATE.padSide },
  labelFont: STANDARD_FONTS.label,
  labelLineH: STATE.labelLineH,
  labelGap: STATE.labelGap,
});
