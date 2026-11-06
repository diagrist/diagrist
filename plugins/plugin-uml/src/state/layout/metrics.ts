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
  pseudoLabelGap: 6,
  /** Widest line of a transition label; beyond it the label breaks before guard and effect. */
  labelLineW: 168,
  laneGap: 16,
  /** Straight run of a line into its head (plan Q4), so also the distance of a rail, and the least step of a Z (Q6). */
  lead: 24,
  labelGap: 8,
  /** Air around frames, and the pads of a composite state below its head. */
  padBottom: 24,
  padSide: 24,
  marginX: 48,
  margin: 32,
  labelDy: 4,
} as const;
