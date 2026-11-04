/**
 * Tones an `area` may take, each as an ink for lines and text and a tint for fills. Every ink keeps a contrast of at
 * least 4.5:1 on white, so a name painted in it stays legible; the tints are light enough for black text on them.
 * `yellow` is an ochre for that reason. No tone repeats the accent of an accented flow.
 */
export const AREA_TONES: Readonly<Record<AreaTone, { readonly ink: string; readonly tint: string }>> = {
  green: { ink: '#15803d', tint: '#dcfce7' },
  orange: { ink: '#c2410c', tint: '#ffedd5' },
  purple: { ink: '#7e22ce', tint: '#f3e8ff' },
  red: { ink: '#b91c1c', tint: '#fee2e2' },
  yellow: { ink: '#a16207', tint: '#fef9c3' },
  teal: { ink: '#0f766e', tint: '#ccfbf1' },
  pink: { ink: '#be185d', tint: '#fce7f3' },
  sky: { ink: '#0369a1', tint: '#e0f2fe' },
};

/** A name of `AREA_TONES`. */
export type AreaTone = 'green' | 'orange' | 'purple' | 'red' | 'yellow' | 'teal' | 'pink' | 'sky';

/** The names of `AREA_TONES` in their order, for `oneOf` and for the order of generated rules. */
export const AREA_TONE_NAMES: readonly AreaTone[] = Object.keys(AREA_TONES) as AreaTone[];

/** How many areas one picture paints in colour before K106 warns that they are hard to tell apart. */
export const AREA_TONE_LIMIT = 6;

/**
 * How the elements of a coloured area are painted: `tint` a light fill and the outline in its tone, `outline` the
 * outline and the texts in its tone, `stripe` a stripe of its tone at the left edge of an element otherwise in ink.
 * Lines and frames of an area take its ink in every paint.
 */
export type AreaPaint = 'tint' | 'outline' | 'stripe';

/** The names of `AreaPaint`, the first the default. */
export const AREA_PAINTS: readonly AreaPaint[] = ['tint', 'outline', 'stripe'];

/**
 * What a group of the scene belongs to: the tone of its area, and whether it is a `body` (an element, painted as the
 * picture's `AreaPaint` says) or a `line` (a line, its label or a frame, always in the tone's ink).
 */
export interface AreaMark {
  readonly tone: AreaTone;
  readonly as: 'body' | 'line';
}
