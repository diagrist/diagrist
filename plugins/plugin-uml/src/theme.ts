/**
 * Colours, strokes and fonts of the plain UML look (`aidi-mono` in the predecessor). They move to the kernel
 * once a second plugin shares them (ADR 0008 Nr. 6); until then they are the plugin's own.
 */
export const COLORS = {
  canvas: '#fafafa',
  fill: '#ffffff',
  fillMuted: '#f4f4f5',
  stroke: '#18181b',
  border: '#a1a1aa',
  grid: '#e4e4e7',
  note: '#52525b',
  accent: '#1d4ed8',
  accentSoft: '#dbeafe',
} as const;

/** Stroke widths by what is drawn. */
export const STROKES = {
  line: 1.5,
  accent: 1.8,
  shape: 1.5,
  emph: 2.5,
  frame: 1,
  frameOwn: 2,
  halo: 4,
} as const;

/** Dash patterns: dashed lines, and the finer pattern of frames and lifelines. */
export const DASH = { line: '6 4', frame: '4 3' } as const;

export const FONT_FAMILY = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';

/** Font sizes in pixels by role; layout measures and the stylesheet sets them with the same numbers. */
export const FONT_SIZE = { title: 14, node: 12, group: 11, label: 10, note: 10, badge: 10 } as const;

/** Named colour tones of heads and bars in the card look (`tone=`), in the order the stylesheet lists them. */
export const TONES = {
  blue: '#2b7de9',
  indigo: '#3949ab',
  purple: '#8e24aa',
  maroon: '#7b1346',
  green: '#1db954',
  teal: '#0b5d4b',
  slate: '#37474f',
  red: '#c62a2f',
  orange: '#f39222',
  peach: '#fde0c2',
  sky: '#b4d5ec',
} as const;

export type Tone = keyof typeof TONES;

export const TONE_NAMES = Object.keys(TONES) as Tone[];

/** Margin of title, decision bar and picture to the edge of the sheet. */
export const MARGIN = 32;

/** Edge length of an arrowhead. */
export const MARKER_SIZE = 12;
