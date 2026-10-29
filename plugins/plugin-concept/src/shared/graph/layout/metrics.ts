import { type Font, STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { EdgeText, GridMetrics } from '@diagrist/layout-grid';
import { MARGIN, wrap } from '@diagrist/parts';

const sans = (size: number, weight?: number): Font => ({ size, family: 'inter', ...(weight ? { weight } : {}) });

/**
 * Font roles of graph pictures, all in the sans face: the title, the names of items, the stronger names of the
 * first column that tells the story, the entries, the texts on lines, and the heads of columns.
 */
export const GRAPH_FONTS = {
  ...STANDARD_FONTS,
  title: sans(15, 600),
  note: sans(11),
  name: sans(12),
  heading: sans(12, 600),
  lead: sans(13, 600),
  entry: sans(11),
  label: sans(11),
  head: sans(11, 600),
} as const satisfies Readonly<Record<string, Font>>;

/** Width of the widest text on a line. */
export const widestText = (all: readonly EdgeText[]): number =>
  Math.max(0, ...all.map((t) => textWidth(t.name ?? '', GRAPH_FONTS.label)));

/** Measures of items, in pixels: widths a name wraps to, pads, line heights, the room of a figure. */
export const ITEM = {
  minW: 120,
  maxW: 216,
  minH: 40,
  padX: 12,
  padY: 10,
  nameLine: 16,
  leadLine: 17,
  leadGap: 12,
  entryLine: 14,
  entryGap: 8,
  figure: 20,
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
  rowGap: 16,
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
  labelFont: GRAPH_FONTS.label,
  labelLineH: 14,
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
  /** The item leads a row of the story: drawn as its text alone, without a shape. */
  readonly lead: boolean;
}

const widest = (lines: readonly string[], font: Font) => Math.max(0, ...lines.map((l) => textWidth(l, font)));

/**
 * Measures an item, with room on the left for a figure: its name and entries wrapped to at most `ITEM.maxW`, its box
 * at least `ITEM.minW` wide, its name a heading when entries follow. An item that leads a row of the story is its
 * text alone, in the stronger font, with room after it before its lines start.
 */
export function measureItem(label: string, entries: readonly string[], figure: boolean, lead = false): ItemBox {
  const F = GRAPH_FONTS;
  const font = lead ? F.lead : entries.length > 0 ? F.heading : F.name;
  const indent = figure && !lead ? ITEM.figure : 0;
  const pad = lead ? 0 : ITEM.padX;
  const inner = ITEM.maxW - 2 * pad - indent;
  const name = wrap(label, inner, font);
  const lines = entries.flatMap((e) => wrap(e, inner, F.entry));
  const text = Math.max(widest(name, font), widest(lines, F.entry));
  const line = lead ? ITEM.leadLine : ITEM.nameLine;
  const body = name.length * line + (lines.length > 0 ? ITEM.entryGap + lines.length * ITEM.entryLine : 0);
  if (lead) return { w: Math.ceil(text + ITEM.leadGap), h: Math.ceil(body), name, entries: lines, indent, lead };
  const w = Math.max(ITEM.minW, Math.ceil(text + 2 * pad + indent));
  const h = Math.max(ITEM.minH, Math.ceil(body + 2 * ITEM.padY));
  return { w: Math.ceil(w / 8) * 8, h: Math.ceil(h / 4) * 4, name, entries: lines, indent, lead };
}
