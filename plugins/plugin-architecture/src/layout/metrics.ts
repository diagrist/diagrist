import { FONT_SIZE, type Font } from '@diagrist/core';
import { INSTRUMENT_METRICS } from '../looks/instrument/metrics.js';
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
  /** The fonts of the look by role: layout measures with them, the stylesheet sets them (ADR 0022). */
  readonly fonts: Readonly<Record<FontRole, Font>>;
}

/**
 * Font roles of C4 pictures: the standard ones, the second line of a box as a description (people, systems,
 * nodes) or as a technology (containers, components), status, replica tag, blocks and card titles.
 */
export type FontRole =
  | 'title'
  | 'name'
  | 'group'
  | 'label'
  | 'note'
  | 'description'
  | 'tech'
  | 'badge'
  | 'mark'
  | 'replica'
  | 'block'
  | 'heading'
  | 'large';

/** The fonts of the standard look at sizes `f`, all in its one face. */
function standardFonts(f: FontSizes): Record<FontRole, Font> {
  return {
    title: { size: f.title, weight: 600 },
    name: { size: f.node, weight: 600 },
    group: { size: f.group, weight: 600 },
    label: { size: f.label },
    note: { size: f.note },
    description: { size: f.note },
    tech: { size: f.note },
    badge: { size: f.badge, weight: 700 },
    mark: { size: f.badge - 1, weight: 700 },
    replica: { size: f.badge - 1, weight: 700 },
    block: { size: f.node + 1, weight: 600 },
    heading: { size: f.group + 4, weight: 600 },
    large: { size: f.group + 4 },
  };
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
  fonts: standardFonts(FONT_SIZE),
};

const BLOCK_SIZES: FontSizes = { title: 16, node: 19, group: 16, label: 14, note: 14, badge: 12 };

/** Blocks pack sub-modules tightly, with large text, high boxes and strong lines, as pattern books draw them. */
const BLOCKS: Metrics = {
  ...STANDARD,
  subColGap: 24,
  nodeH: 64,
  nodeLineH: 20,
  labelDy: 7,
  laneGap: 36,
  markerSize: 18,
  fontSize: BLOCK_SIZES,
  fonts: standardFonts(BLOCK_SIZES),
};

const PAPER_SIZES: FontSizes = { title: 15, node: 13, group: 9.5, label: 10.5, note: 11, badge: 9.5 };
const inter = (size: number, weight?: number): Font => ({ size, family: 'inter', ...(weight ? { weight } : {}) });

/**
 * Paper sets names and texts in Inter and only technologies in JetBrains Mono, at the sizes of a printed page;
 * small capitals are tracked. Boxes, rows and columns keep the standard grid, so a picture keeps its arrangement.
 */
const PAPER: Metrics = {
  ...STANDARD,
  firstRowY: 144,
  markerSize: 8,
  nodePad: 16,
  iconSize: 18,
  iconGap: 10,
  nodeLineH: 16,
  labelDy: 5,
  labelDyTech: -3,
  labelGap: 8,
  labelLineH: 14,
  groupTextX: 16,
  groupTitleY: 24,
  groupSubtitleY: 40,
  fontSize: PAPER_SIZES,
  fonts: {
    title: inter(15, 600),
    name: inter(13, 600),
    group: { ...inter(9.5, 600), letterSpacing: 0.7 },
    label: inter(10.5),
    note: inter(11),
    description: inter(11),
    tech: { size: 9.5, family: 'jetbrains-mono' },
    badge: inter(9.5, 600),
    mark: inter(9.5, 600),
    replica: { size: 9, family: 'jetbrains-mono' },
    block: inter(14, 600),
    heading: inter(13, 600),
    large: inter(13),
  },
};
const LOOK_METRICS: Readonly<Record<Look, Metrics>> = {
  plain: STANDARD,
  cards: STANDARD,
  blocks: BLOCKS,
  paper: PAPER,
  instrument: INSTRUMENT_METRICS,
};

/** The measures of a look. */
export const metricsOf = (look: Look): Metrics => LOOK_METRICS[look];
