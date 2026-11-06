import { type Font, STANDARD_FONTS, textWidth } from '@diagrist/core';
import { wrap } from '@diagrist/parts';

/** Font roles of graph pictures besides the standard ones: the entries below an item's name. */
export const GRAPH_FONTS = {
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
} as const;

/** The least gap between columns, and the room a label keeps to the line beside it. */
export const GAP = { col: 56, label: 12 } as const;

/** Room for the heads above the first row of a picture in columns. */
export const HEAD = { room: 32 } as const;

/** Where the first row of items starts below the title line, with and without a subtitle. */
export const FIRST_ROW = { subtitle: 104, title: 88 } as const;

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
  const F = GRAPH_FONTS;
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
