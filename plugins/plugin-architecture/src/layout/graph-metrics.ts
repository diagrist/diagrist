import { DEFAULT_THRESHOLDS } from '@diagrist/core';
import type { CellMetrics, LayoutGraph } from '@diagrist/layout-grid';
import type { Look } from '../looks/look.js';

/** Where the grid starts: the top of its first row, and the room left of it besides the margin. */
export interface GridStart {
  readonly firstRowY: number;
  readonly indent: number;
}

/** The measures of the layout graph and of its grid; the icon circle of a card on the top edge overhangs its row. */
export function metricsOf(
  { metrics: m, fonts, options }: Look,
  start: GridStart,
): Pick<LayoutGraph, 'metrics'> & {
  cells: CellMetrics;
} {
  const lead = DEFAULT_THRESHOLDS.lead;
  return {
    metrics: {
      colGap: m.colGap,
      rowGapMin: m.rowGap,
      track: m.laneGap,
      portGap: m.portSpread,
      lead,
      tail: lead,
      labelGap: m.labelGap,
      left: m.marginX,
      top: start.firstRowY,
    },
    cells: {
      grid: m.grid,
      nodeW: m.nodeW,
      nodeH: m.nodeH,
      subColGap: m.subColGap,
      ...(start.indent > 0 ? { indent: start.indent } : {}),
      margin: m.margin,
      loopReach: m.loopReach,
      framePad: { top: m.groupPadTop, bottom: m.groupPadBottom, x: m.groupPadX },
      labelFont: fonts.label,
      labelLineH: m.labelLineH,
      rowOverhang: options.nodes === 'card' ? m.cardIconR : 0,
    },
  };
}
