import { FONT_STACKS } from '../text.js';

/**
 * Colours of the standard look (`aidi-mono` in the predecessor), shared by every plugin that draws with
 * `standardStyles`. A `Theme` passed to `compile` repaints them per rule; these are the defaults it overlays.
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

/** Stroke widths of the standard look by what is drawn. */
export const STROKES = { line: 1.5, accent: 1.8, shape: 1.5, emph: 2.5, frame: 1, frameOwn: 2, halo: 4 } as const;

/** Dash patterns: dashed lines, and the finer pattern of frames and guide lines. */
export const DASH = { line: '6 4', frame: '4 3' } as const;

/** The font stack of the standard look; layout measures with the bundled JetBrains Mono metrics. */
export const FONT_FAMILY: string = FONT_STACKS['jetbrains-mono'];

/** Font sizes in pixels by role; layout measures and the stylesheet sets them with the same numbers. */
export const FONT_SIZE = { title: 14, node: 12, group: 11, label: 10, note: 10, badge: 10 } as const;

/** Named colour tones a statement may pick with `tone=`, in the order stylesheets list them. */
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

/** A name of `TONES`. */
export type Tone = keyof typeof TONES;

/** The names of `TONES` in their order, for `oneOf` in statement tables and for generated rules. */
export const TONE_NAMES: readonly Tone[] = Object.keys(TONES) as Tone[];

/** Edge length of an arrowhead in pixels. */
export const MARKER_SIZE = 12;
