import type { Font } from '@diagrist/core';
import type { FontSizes, Metrics } from '../../layout/metrics.js';

const SIZES: FontSizes = { title: 17, node: 13, group: 11, label: 11, note: 11, badge: 10 };

const geist = (size: number, weight?: number): Font => ({ size, family: 'geist', ...(weight ? { weight } : {}) });
const mono = (size: number): Font => ({ size, family: 'geist-mono' });

/**
 * The measures of `look=panel`: names and texts in Geist, protocols and numbers in Geist Mono, white cards a little
 * larger than the standard boxes with a slot for the party dot or the icon before the name, wider gaps for the
 * labels standing on the lines as pills, and panels with their title centred on top.
 */
export const PANEL_METRICS: Metrics = {
  grid: 8,
  nodeW: 200,
  nodeH: 60,
  personW: 64,
  colGap: 200,
  subColGap: 152,
  rowGap: 128,
  marginX: 48,
  firstRowY: 152,
  groupPadX: 24,
  groupPadTop: 56,
  groupPadBottom: 24,
  portSpread: 16,
  laneGap: 16,
  labelGap: 8,
  badgeOffset: 28,
  loopReach: 32,
  margin: 32,
  legendReserve: 72,
  markerSize: 7,
  nodePad: 16,
  iconSize: 16,
  iconGap: 10,
  nodeLineH: 16,
  labelDy: 5,
  labelDyTech: -3,
  groupTextX: 16,
  groupTitleY: 26,
  groupSubtitleY: 42,
  labelLineH: 14,
  cardIconR: 22,
  circleR: 24,
  stackOffset: 7,
  shadowDy: 2,
  fontSize: SIZES,
  fonts: {
    title: geist(17, 600),
    name: geist(13, 600),
    group: geist(11, 600),
    label: geist(11),
    note: geist(11),
    description: geist(11),
    tech: geist(11),
    badge: mono(10),
    mark: geist(10, 600),
    replica: mono(9.5),
    block: geist(14, 600),
    heading: geist(13, 600),
    large: geist(13),
  },
  detailFont: mono(10),
};
