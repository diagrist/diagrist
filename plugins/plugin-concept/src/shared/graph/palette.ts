/**
 * The colours of graph pictures: greys that let the items carry the picture and the lines step back, and a few
 * muted tones, one per type, for the bar on its items and the head of its column. A tone has a light shade for
 * bars and rules and a dark one for text, so heads stay readable.
 */
export const INK = {
  name: '#18181b',
  muted: '#71717a',
  line: '#a1a1aa',
  border: '#d4d4d8',
  hairline: '#e4e4e7',
  fill: '#ffffff',
  soft: '#f4f4f5',
} as const;

/** The tones a type may take with `tone=`, in the order columns take them when a type names none. */
export const TYPE_TONES = {
  blue: { bar: '#6b8fc7', text: '#3d5f94' },
  amber: { bar: '#d9a441', text: '#8f6416' },
  teal: { bar: '#5aa596', text: '#2f6f63' },
  plum: { bar: '#a47aa8', text: '#6d4672' },
  slate: { bar: '#8794a3', text: '#4a5563' },
} as const;

/** A name of `TYPE_TONES`. */
export type TypeTone = keyof typeof TYPE_TONES;

/** The names of `TYPE_TONES` in their order. */
export const TYPE_TONE_NAMES: readonly TypeTone[] = Object.keys(TYPE_TONES) as TypeTone[];
