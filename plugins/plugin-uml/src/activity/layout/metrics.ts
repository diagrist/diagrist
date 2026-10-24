import { FONT_SIZE, type Font, type Rect, STANDARD_FONTS, textWidth as textWidthOf } from '@diagrist/core';

/** Font roles of activity diagrams: layout measures with them, the style table sets them. */
export const ACT_FONTS = {
  ...STANDARD_FONTS,
  act: { size: FONT_SIZE.node },
} as const satisfies Record<string, Font>;

/**
 * Measures of activity diagrams in pixels, as the predecessor drew them: shapes after the learning platform, gaps
 * set tighter because Diagrist measures text instead of taking fixed widths.
 */
export const ACT = {
  actionMinW: 96,
  actionPadX: 16,
  actionH: 40,
  lineH: 15,
  actionRx: 12,
  /** Texts wider than this wrap into two lines. */
  wrapW: 208,
  initialR: 10,
  finalR: 12,
  finalCore: 7,
  diamond: 32,
  /** Bar of fork and join: thickness, overhang beyond the outermost branch, least length. */
  bar: 6,
  barOverhang: 24,
  barMinW: 72,
  /** Depth of the tip of a send signal and of the notch of an accept event. */
  signalTip: 14,
  hourglassW: 18,
  hourglassH: 24,
  /** Gap between a symbol and its text beside it: the question of a decision, the time of a time event. */
  sideGap: 8,
  layerGap: 48,
  branchGap: 40,
  laneHeadH: 32,
  lanePadX: 24,
  lanePadY: 24,
  laneMinW: 176,
  /** Gap of the channel of a loop to the outermost node and between two channels. */
  loopGap: 24,
  /** Offset of parallel horizontal pieces in one gap between layers. */
  track: 8,
  guardGap: 6,
  pin: 10,
  pinGap: 4,
  rakeW: 14,
  rakeH: 12,
  rakeInset: 8,
  callExtra: 32,
  regionPad: 12,
  regionRx: 10,
  regionLabelH: 14,
  /** Edge length of one of the four boxes of an expansion node. */
  expansionSlot: 12,
  /** Half size of the lightning bolt of an interrupting edge. */
  bolt: 8,
  /** Left edge of the first lane, top of the first row, margin below the picture. */
  marginX: 48,
  firstRowY: 128,
  margin: 32,
} as const;

/** Sizes of the two text roles: text in boxes, labels beside shapes and edges. */
export const SIZE = { node: FONT_SIZE.node, label: FONT_SIZE.label } as const;

/** Width of a text in boxes (`bold` for lane heads) or of a label. */
export const widthOf = {
  node: (text: string, bold = false): number => textWidthOf(text, bold ? STANDARD_FONTS.name : ACT_FONTS.act),
  label: (text: string): number => textWidthOf(text, STANDARD_FONTS.label),
};

/** Centre and far edges of a rectangle. */
export const cx = (r: Rect): number => r.x + r.w / 2;
export const cy = (r: Rect): number => r.y + r.h / 2;
export const right = (r: Rect): number => r.x + r.w;
export const bottom = (r: Rect): number => r.y + r.h;

/** The smallest rectangle around all of them. */
export function union(rects: readonly Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  return { x, y, w: Math.max(...rects.map(right)) - x, h: Math.max(...rects.map(bottom)) - y };
}

/** A point as the layout moves it around; the scene reads it as a `Point`. */
export type XY = [number, number];
