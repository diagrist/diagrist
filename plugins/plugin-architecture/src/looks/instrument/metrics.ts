import type { Font } from '@diagrist/core';
import type { FontRole, FontSizes, Metrics } from '../../layout/metrics.js';

const SIZES: FontSizes = { title: 14, node: 13, group: 9.5, label: 10.5, note: 10.5, badge: 9.5 };

const grotesk = (size: number, weight: number, letterSpacing?: number): Font => ({
  size,
  family: 'space-grotesk',
  ...(weight === 500 ? { weight } : {}),
  ...(letterSpacing ? { letterSpacing } : {}),
});
const mono = (size: number): Font => ({ size, family: 'jetbrains-mono' });

/**
 * The fonts of `look=instrument`: names, labels and tags in tracked capitals of Space Grotesk Medium, descriptions
 * in its regular face, the type line above a name as a micro label, numbers in JetBrains Mono. Layout measures the
 * texts in capitals, as they are drawn.
 */
export const INSTRUMENT_FONTS: Readonly<Record<FontRole, Font>> = {
  title: grotesk(14, 500, 0.84),
  name: grotesk(13, 500, 0.5),
  group: grotesk(9.5, 500, 1),
  label: grotesk(10.5, 500, 0.4),
  note: grotesk(10.5, 400),
  description: grotesk(10.5, 400),
  tech: grotesk(8, 500, 0.96),
  badge: mono(9.5),
  mark: mono(9.5),
  replica: mono(9),
  block: grotesk(13, 500, 0.5),
  heading: grotesk(9.5, 500, 1),
  large: grotesk(10.5, 400),
};

/** Fonts of the sheet besides the roles of the kind: the chosen option of a decision. */
export const INSTRUMENT_SHEET_FONTS: Readonly<Record<'choice', Font>> = { choice: grotesk(10.5, 500) };

/**
 * The measures of `look=instrument`: the standard grid with higher boxes for the micro label above the name, a
 * wider gap between a line and the tag beside it, and lower frame heads, since a frame's title stands in a bar.
 */
export const INSTRUMENT_METRICS: Metrics = {
  grid: 8,
  nodeW: 192,
  nodeH: 64,
  personW: 64,
  colGap: 136,
  subColGap: 104,
  rowGap: 120,
  marginX: 48,
  firstRowY: 136,
  groupPadX: 24,
  groupPadTop: 48,
  groupPadBottom: 24,
  portSpread: 16,
  laneGap: 16,
  labelGap: 10,
  badgeOffset: 28,
  loopReach: 32,
  margin: 32,
  legendReserve: 72,
  markerSize: 6,
  nodePad: 14,
  iconSize: 18,
  iconGap: 10,
  nodeLineH: 16,
  labelDy: 5,
  labelDyTech: -3,
  groupTextX: 12,
  groupTitleY: 13,
  groupSubtitleY: 13,
  labelLineH: 14,
  cardIconR: 22,
  circleR: 24,
  stackOffset: 4,
  shadowDy: 0,
  fontSize: SIZES,
  fonts: INSTRUMENT_FONTS,
};
