import { type Font, STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { EdgeText, GridMetrics } from '@diagrist/layout-grid';
import { MARGIN, wrap } from '@diagrist/parts';
import { widestText } from './edges.js';

/** Font roles of graph pictures besides the standard ones: the entries below an item's name. */
export const GRAPH_FONTS = {
  ...STANDARD_FONTS,
  entry: { size: 10 },
  head: { size: 10, weight: 700, letterSpacing: 0.8 },
} as const satisfies Readonly<Record<string, Font>>;

/** Measures of items, in pixels: widths a name wraps to, pads, line heights, the room of a figure. */
export const ITEM = {
  minW: 120,
  maxW: 216,
  minH: 48,
  padX: 14,
  padY: 12,
  nameLine: 15,
  entryLine: 13,
  entryGap: 8,
  figure: 20,
  bar: 8,
  fold: 10,
  lid: 8,
  perLayer: 5,
} as const;

/** The least gap between columns, and the room a label keeps to the line beside it. */
export const GAP = { col: 56, label: 12 } as const;

/**
 * Measures of a picture in columns: room for the heads above the first row, the gap between half rows, and the gap
 * between columns, wide enough for the widest text on a line between them and its arrowhead, twice that where a
 * relation forks halfway across.
 */
export const HEAD = {
  room: 32,
  rowGap: 28,
  colGap: (all: readonly EdgeText[], fans: boolean): number =>
    Math.max(72, Math.ceil((fans ? 2 : 1) * (widestText(all) + 2 * GAP.label) + 16)),
} as const;

/** Where the grid starts below the title line, with and without a subtitle. */
export const FIRST_ROW = { subtitle: 104, title: 88 } as const;

/**
 * The measures `layout-grid` lays a graph picture out with: an adaptive grid of layers, orthogonal lines, and columns
 * `colGap` apart, which the caller widens so labels beside the lines have room.
 */
export const graphMetrics = (firstRowY: number, colGap: number = GAP.col): GridMetrics => ({
  grid: 8,
  nodeW: ITEM.minW,
  nodeH: ITEM.minH,
  colGap,
  subColGap: colGap,
  rowGap: 72,
  marginX: MARGIN,
  firstRowY,
  margin: 32,
  laneGap: 12,
  portSpread: 12,
  loopReach: 24,
  framePad: { top: 32, bottom: 16, x: 16 },
  labelFont: STANDARD_FONTS.label,
  labelLineH: 12,
  labelGap: 6,
});

/** An item measured: its size and its name and entries wrapped to its width. */
export interface ItemBox {
  readonly w: number;
  readonly h: number;
  readonly name: readonly string[];
  readonly entries: readonly string[];
  /** Room left of the texts, for the figure of a person. */
  readonly indent: number;
}

const widest = (lines: readonly string[], font: Font) => Math.max(0, ...lines.map((l) => textWidth(l, font)));

/** Measures an item, with room on the left for a figure and a bar: its name and entries wrapped to at most `ITEM.maxW`, its box at least `ITEM.minW` wide. */
export function measureItem(label: string, entries: readonly string[], figure: boolean, bar = false): ItemBox {
  const F = GRAPH_FONTS;
  const indent = (figure ? ITEM.figure : 0) + (bar ? ITEM.bar : 0);
  const inner = ITEM.maxW - 2 * ITEM.padX - indent;
  const name = wrap(label, inner, F.name);
  const lines = entries.flatMap((e) => wrap(e, inner, F.entry));
  const text = Math.max(widest(name, F.name), widest(lines, F.entry));
  const w = Math.max(ITEM.minW, Math.ceil(text + 2 * ITEM.padX + indent));
  const body = name.length * ITEM.nameLine + (lines.length > 0 ? ITEM.entryGap + lines.length * ITEM.entryLine : 0);
  const h = Math.max(ITEM.minH, Math.ceil(body + 2 * ITEM.padY));
  return { w: Math.ceil(w / 8) * 8, h: Math.ceil(h / 4) * 4, name, entries: lines, indent };
}
