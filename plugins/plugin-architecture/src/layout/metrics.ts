import type { Font } from '@diagrist/core';

/** Font sizes by role, from which `standardFonts` makes the fonts of a look set in one face. */
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
 * gaps, pads of frames and node insides, and the corner radii of boxes and frames. Font sizes are those of the
 * look's fonts.
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
  /** Corner radius of a box of the `box` family. */
  readonly nodeRx: number;
  /** Corner radius of a frame and of a panel. */
  readonly frameRx: number;
  /** How far icon and texts in a cylinder move down, below the front of its lid. */
  readonly dbTextShift: number;
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

/** The fonts of a look set in the standard face at sizes `f`, as plain, cards and blocks are. */
export function standardFonts(f: FontSizes): Record<FontRole, Font> {
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

/** The measures of the standard look, which every look spreads and changes where it differs. */
export const STANDARD: Metrics = {
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
  nodeRx: 8,
  frameRx: 10,
  dbTextShift: 0,
};
