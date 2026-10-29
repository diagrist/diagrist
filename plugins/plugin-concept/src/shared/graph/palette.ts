/**
 * The colours of graph pictures: greys that order the picture by contrast, the names darkest, entries, heads and
 * lines lighter, and per type one pale tint for the cards of its items, so a column reads as one without a frame.
 */
export const INK = {
  name: '#18181b',
  text: '#3f3f46',
  muted: '#71717a',
  quiet: '#a1a1aa',
  line: '#b4b4bc',
  border: '#d4d4d8',
  fill: '#ffffff',
  soft: '#f4f4f5',
} as const;

/** The tones a type may take with `tone=`, in the order columns take them when a type names none. */
export const TYPE_TONES = {
  blue: { tint: '#eaf0f8' },
  amber: { tint: '#f8f0e1' },
  teal: { tint: '#e6f2ef' },
  plum: { tint: '#f3ecf4' },
  slate: { tint: '#edeff2' },
} as const;

/** A name of `TYPE_TONES`. */
export type TypeTone = keyof typeof TYPE_TONES;

/** The names of `TYPE_TONES` in their order. */
export const TYPE_TONE_NAMES: readonly TypeTone[] = Object.keys(TYPE_TONES) as TypeTone[];
