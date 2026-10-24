import { FONT_SIZE, type Font, textWidth } from '@diagrist/core';
import type { Look } from '../model/types.js';

/** Font sizes by role, the same numbers the layout measures with and the stylesheet sets. */
export interface FontSizes {
  readonly title: number;
  readonly node: number;
  readonly group: number;
  readonly label: number;
  readonly note: number;
  readonly badge: number;
}

/**
 * The measures of a C4 picture in one look, as the predecessor's theme `aidi-mono` had them: the grid, boxes,
 * gaps, pads of frames and node insides. `blocks` packs larger text into higher boxes.
 */
export interface Metrics {
  readonly grid: number;
  readonly nodeW: number;
  readonly nodeH: number;
  readonly personW: number;
  readonly colGap: number;
  readonly subColGap: number;
  readonly rowGap: number;
  readonly marginX: number;
  readonly firstRowY: number;
  readonly groupPadX: number;
  readonly groupPadTop: number;
  readonly groupPadBottom: number;
  readonly portSpread: number;
  readonly laneGap: number;
  readonly labelGap: number;
  readonly badgeOffset: number;
  readonly loopReach: number;
  readonly margin: number;
  readonly legendReserve: number;
  readonly markerSize: number;
  readonly nodePad: number;
  readonly iconSize: number;
  readonly iconGap: number;
  readonly nodeLineH: number;
  readonly labelDy: number;
  readonly labelDyTech: number;
  readonly groupTextX: number;
  readonly groupTitleY: number;
  readonly groupSubtitleY: number;
  readonly labelLineH: number;
  readonly cardIconR: number;
  readonly circleR: number;
  readonly stackOffset: number;
  readonly shadowDy: number;
  readonly fontSize: FontSizes;
}

const STANDARD: Metrics = {
  grid: 8,
  nodeW: 192,
  nodeH: 56,
  personW: 64,
  colGap: 136,
  subColGap: 104,
  rowGap: 120,
  marginX: 48,
  firstRowY: 128,
  groupPadX: 24,
  groupPadTop: 56,
  groupPadBottom: 24,
  portSpread: 16,
  laneGap: 16,
  labelGap: 10,
  badgeOffset: 28,
  loopReach: 32,
  margin: 32,
  legendReserve: 72,
  markerSize: 12,
  nodePad: 14,
  iconSize: 22,
  iconGap: 12,
  nodeLineH: 14,
  labelDy: 4,
  labelDyTech: -2,
  groupTextX: 12,
  groupTitleY: 20,
  groupSubtitleY: 33,
  labelLineH: 12,
  cardIconR: 22,
  circleR: 24,
  stackOffset: 7,
  shadowDy: 2,
  fontSize: FONT_SIZE,
};

/** Blocks pack sub-modules tightly, with large text, high boxes and strong lines, as pattern books draw them. */
const BLOCKS: Metrics = {
  ...STANDARD,
  subColGap: 24,
  nodeH: 64,
  nodeLineH: 20,
  labelDy: 7,
  laneGap: 36,
  markerSize: 18,
  fontSize: { title: 16, node: 19, group: 16, label: 14, note: 14, badge: 12 },
};

/** The measures of a look. */
export const metricsOf = (look: Look): Metrics => (look === 'blocks' ? BLOCKS : STANDARD);

/** Width of a text in pixels at `size`, bold or regular, as the layout measures it. */
export const measure = (text: string, size: number, bold = false): number => textWidth(text, fontOf(size, bold));

/** The font of a text at `size`, bold with weight 600. */
export const fontOf = (size: number, bold = false): Font => (bold ? { size, weight: 600 } : { size });
