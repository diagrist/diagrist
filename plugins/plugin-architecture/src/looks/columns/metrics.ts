import { type Font, textWidth } from '@diagrist/core';
import type { FontSizes, Metrics } from '../../layout/metrics.js';
import type { ArchitectureModel } from '../../model/types.js';
import { bandsOf, rowBandsOf, withoutBandFrames } from './bands.js';

const inter = (size: number, weight?: number): Font => ({ size, family: 'inter', ...(weight ? { weight } : {}) });
const mono = (size: number): Font => ({ size, family: 'jetbrains-mono' });

const SIZES: FontSizes = { title: 13.5, node: 11.5, group: 9, label: 11.5, note: 11, badge: 10 };

/** Edge labels as drawn: the verb in SemiBold, the rest in Regular, the protocol in JetBrains Mono. */
export const LABEL_FONT: Font = inter(11.5, 600);

/**
 * The fonts of `look=columns`: Inter for names and texts, its SemiBold standing in for bold, JetBrains Mono for
 * technologies; small capitals tracked by 0.13 em. Edge labels are measured bold and a little tracked, so the verb
 * set bold and a protocol in the wider monospace face fit the room they are given.
 */
export const COLUMNS_FONTS: Metrics['fonts'] = {
  title: inter(13.5, 600),
  name: inter(11.5, 600),
  group: { ...inter(9, 600), letterSpacing: 1.17 },
  label: { ...LABEL_FONT, letterSpacing: 0.8 },
  note: inter(11),
  description: inter(11),
  tech: mono(10),
  badge: inter(10, 600),
  mark: inter(9.5, 600),
  replica: mono(9),
  block: inter(13.5, 600),
  heading: inter(13.5, 600),
  large: inter(13.5),
};

/** Where the column heads stand and how far the first row keeps from them. */
export const BAND = { top: 24, h: 60, gap: 40, pad: 16, inset: 4 } as const;
const MARGIN_X = 48;
const ROW_BAND_MIN = 128;
const ROW_BAND_GAP = 40;

/**
 * The measures of `look=columns` without column heads: boxes a little larger than the standard look, for the name in
 * the top edge and the icon above the second line, the grid otherwise as in the standard look.
 */
export const COLUMNS: Metrics = {
  grid: 8,
  nodeW: 200,
  nodeH: 64,
  personW: 160,
  colGap: 136,
  subColGap: 88,
  rowGap: 112,
  marginX: MARGIN_X,
  firstRowY: BAND.top + 16,
  groupPadX: 24,
  groupPadTop: 64,
  groupPadBottom: 24,
  portSpread: 16,
  laneGap: 16,
  labelGap: 8,
  badgeOffset: 28,
  loopReach: 32,
  margin: 32,
  legendReserve: 72,
  markerSize: 9,
  nodePad: 16,
  iconSize: 20,
  iconGap: 10,
  nodeLineH: 16,
  labelDy: 4,
  labelDyTech: -3,
  groupTextX: 16,
  groupTitleY: 24,
  groupSubtitleY: 40,
  labelLineH: 15,
  cardIconR: 22,
  circleR: 24,
  stackOffset: 4,
  shadowDy: 2,
  fontSize: SIZES,
  fonts: COLUMNS_FONTS,
};

/** Width of the row bands at the left, as wide as the longest layer name. */
export const rowBandWidth = (labels: readonly string[]): number =>
  Math.max(ROW_BAND_MIN, ...labels.map((l) => textWidth(l, COLUMNS_FONTS.title) + 2 * BAND.pad));

/**
 * The measures for one model: with column heads the first row moves below them, with row bands the grid moves
 * right of them.
 */
export function columnsMetrics(model: ArchitectureModel): Metrics {
  const bands = bandsOf(model);
  const rows = rowBandsOf(model, bands);
  const framed = withoutBandFrames(model, bands).groups.length > 0 ? COLUMNS.groupPadTop : 0;
  const firstRowY = (bands.length > 0 ? BAND.top + BAND.h + BAND.gap : COLUMNS.firstRowY) + framed;
  const marginX = rows.length > 0 ? BAND.top + rowBandWidth(rows.map((l) => l.label)) + ROW_BAND_GAP : MARGIN_X;
  return { ...COLUMNS, firstRowY, marginX };
}
