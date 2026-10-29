import { type Font, STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { GridMetrics } from '@diagrist/layout-grid';
import { MARGIN, wrap } from '@diagrist/parts';

/** Font roles of concept pictures besides the standard ones: the entries below an item's name. */
export const CONCEPT_FONTS = {
  ...STANDARD_FONTS,
  entry: { size: 10 },
} as const satisfies Readonly<Record<string, Font>>;

/** Measures of items, in pixels: widths a name wraps to, pads, line heights, the room of a figure. */
export const ITEM = {
  minW: 120,
  maxW: 216,
  minH: 44,
  padX: 12,
  padY: 10,
  nameLine: 15,
  entryLine: 13,
  entryGap: 8,
  figure: 20,
  fold: 10,
  lid: 8,
  perLayer: 5,
} as const;

/** Where the grid starts below the title line, with and without a subtitle. */
export const FIRST_ROW = { subtitle: 104, title: 88 } as const;

/** The measures `layout-grid` lays a concept picture out with: an adaptive grid of layers, orthogonal lines. */
export const conceptMetrics = (firstRowY: number): GridMetrics => ({
  grid: 8,
  nodeW: ITEM.minW,
  nodeH: ITEM.minH,
  colGap: 56,
  subColGap: 56,
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

/** Measures an item: its name and entries wrapped to at most `ITEM.maxW`, its box at least `ITEM.minW` wide. */
export function measureItem(label: string, entries: readonly string[], figure: boolean): ItemBox {
  const F = CONCEPT_FONTS;
  const indent = figure ? ITEM.figure : 0;
  const inner = ITEM.maxW - 2 * ITEM.padX - indent;
  const name = wrap(label, inner, F.name);
  const lines = entries.flatMap((e) => wrap(e, inner, F.entry));
  const text = Math.max(widest(name, F.name), widest(lines, F.entry));
  const w = Math.max(ITEM.minW, Math.ceil(text + 2 * ITEM.padX + indent));
  const body = name.length * ITEM.nameLine + (lines.length > 0 ? ITEM.entryGap + lines.length * ITEM.entryLine : 0);
  const h = Math.max(ITEM.minH, Math.ceil(body + 2 * ITEM.padY));
  return { w: Math.ceil(w / 8) * 8, h: Math.ceil(h / 4) * 4, name, entries: lines, indent };
}
