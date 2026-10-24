import { type FaceMetrics, FONT_METRICS } from './font-metrics.js';
import { INTER_REGULAR } from './inter-regular.js';
import { INTER_SEMIBOLD } from './inter-semibold.js';
import { type PackedFace, unpackFace } from './packed-face.js';

/**
 * A typeface the kernel bundles in `fonts/`, measures from its own table and hands to rasterizers: JetBrains Mono,
 * the face of the standard look, and Inter, the proportional face of looks that ask for it (ADR 0022).
 */
export type Typeface = 'jetbrains-mono' | 'inter';

/** How a text is set: size in pixels, CSS weight (400 regular, 600 and above bold), typeface and tracking. */
export interface Font {
  readonly size: number;
  readonly weight?: number;
  /** The bundled typeface; JetBrains Mono when left out, so the standard look keeps its stylesheet. */
  readonly family?: Typeface;
  /** Extra space after every character in pixels, written as CSS `letter-spacing`, e.g. for small capitals. */
  readonly letterSpacing?: number;
}

/** The CSS font stacks of the bundled typefaces: the bundled family first, then what a browser may use instead. */
export const FONT_STACKS: Readonly<Record<Typeface, string>> = {
  'jetbrains-mono': '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  inter: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const BOLD = 600;

type Advance = (codePoint: number) => number;

function lookup(face: FaceMetrics): Advance {
  const exceptions = new Map(face.exceptions);
  return (codePoint) => exceptions.get(codePoint) ?? face.advance;
}

function unpacked(face: PackedFace): Advance {
  const advances = unpackFace(face);
  return (codePoint) => advances.get(codePoint) ?? face.advance;
}

/** Advances of each bundled typeface, regular and bold, and the units per em they are given in. */
const FACES: Readonly<
  Record<Typeface, { readonly regular: Advance; readonly bold: Advance; readonly unitsPerEm: number }>
> = {
  'jetbrains-mono': {
    regular: lookup(FONT_METRICS.regular),
    bold: lookup(FONT_METRICS.bold),
    unitsPerEm: FONT_METRICS.unitsPerEm,
  },
  inter: { regular: unpacked(INTER_REGULAR), bold: unpacked(INTER_SEMIBOLD), unitsPerEm: INTER_REGULAR.unitsPerEm },
};

/**
 * Width of a single line of text in pixels, rounded up, measured with the advances of the bundled typeface.
 * Same text, same number, in every runtime: no browser, no font loading. The sum runs glyph by glyph in the
 * order and floating point steps of opentype.js 2.0, which the predecessor used, so widths stay byte-identical.
 * Kerning is not counted, so pictures in a proportional face switch it off (ADR 0022); letter spacing is.
 */
export function textWidth(text: string, font: Font): number {
  const face = FACES[font.family ?? 'jetbrains-mono'];
  const advance = (font.weight ?? 0) >= BOLD ? face.bold : face.regular;
  const scale = (1 / face.unitsPerEm) * font.size;
  const spacing = font.letterSpacing ?? 0;
  let width = 0;
  for (const char of text) {
    const units = advance(char.codePointAt(0) ?? 0);
    if (units !== 0) width += units * scale;
    if (spacing !== 0) width += spacing;
  }
  return Math.ceil(width);
}
