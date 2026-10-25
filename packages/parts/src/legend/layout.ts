import { STANDARD_FONTS, textWidth } from '@diagrist/core';
import { MARGIN, type Spot } from '../sheet/header.js';

/**
 * Measures of legend samples in the standard look: a wide sample (a line, a swatch) and where the text after it
 * starts, and the shorter distance after a narrow one, such as a decision mark.
 */
export const LEGEND: { readonly sampleWidth: number; readonly labelDx: number; readonly markDx: number } = {
  sampleWidth: 40,
  labelDx: 52,
  markDx: 20,
};

/**
 * What the plugin explains in its legend, in reading order: a sample only the plugin knows how to draw, how wide
 * it is, where its text starts relative to it, and the text.
 */
export interface LegendItem<S> {
  readonly sample: S;
  readonly sampleWidth: number;
  readonly labelDx: number;
  readonly text: string;
}

/** An item placed on its row: the sample at `at` (left end, on the row's middle line) and the text's baseline. */
export interface LegendEntry<S> {
  readonly sample: S;
  readonly at: Spot;
  readonly text: string;
  readonly textAt: Spot;
}

/** The legend: a separator above it and the placed entries, row by row. */
export interface Legend<S> {
  readonly separator: { readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number };
  readonly entries: readonly LegendEntry<S>[];
  /** Lower edge of the legend, where the sheet's margin begins. */
  readonly bottom: number;
}

const BASELINE_DY = 16;
const SEPARATOR_DY = 8;
const TEXT_DY = 4;
const BOTTOM_PAD = 40;
const ROW_H = 24;
const GAP = 40;

/**
 * Places the items from `top` on, left to right, and starts a new row when the next one would cross the right
 * margin of a sheet `width` wide. An item takes the width of its sample or of its text, whichever ends later.
 */
export function legendLayout<S>(items: readonly LegendItem<S>[], top: number, width: number): Legend<S> {
  const baseline = top + BASELINE_DY;
  let x = MARGIN;
  let row = 0;
  const entries: LegendEntry<S>[] = [];
  for (const item of items) {
    const w = Math.max(item.sampleWidth, item.labelDx + textWidth(item.text, STANDARD_FONTS.note));
    if (x + w > width - MARGIN) {
      x = MARGIN;
      row++;
    }
    const y = baseline + row * ROW_H;
    entries.push({
      sample: item.sample,
      at: { x, y },
      text: item.text,
      textAt: { x: x + item.labelDx, y: y + TEXT_DY },
    });
    x += w + GAP;
  }
  const separatorY = top - SEPARATOR_DY;
  return {
    separator: { x1: MARGIN, y1: separatorY, x2: width - MARGIN, y2: separatorY },
    entries,
    bottom: baseline + row * ROW_H + BOTTOM_PAD,
  };
}
