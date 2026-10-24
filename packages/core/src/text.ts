import { type FaceMetrics, FONT_METRICS } from './font-metrics.js';
import { INTER_REGULAR } from './inter-regular.js';
import { INTER_SEMIBOLD } from './inter-semibold.js';
import { type PackedFace, unpackFace } from './packed-face.js';
import { SPACE_GROTESK_MEDIUM } from './space-grotesk-medium.js';
import { SPACE_GROTESK_REGULAR } from './space-grotesk-regular.js';

/**
 * A typeface the kernel bundles in `fonts/`, measures from its own table and hands to rasterizers: JetBrains Mono,
 * the face of the standard look, and Inter and Space Grotesk, the proportional faces of looks that ask for them
 * (ADR 0022).
 */
export type Typeface = 'jetbrains-mono' | 'inter' | 'space-grotesk';

/**
 * How a text is set: size in pixels, CSS weight, typeface and tracking. The weight picks the heavier of the two
 * bundled faces from 600 on, in Space Grotesk, whose heavier face is Medium, from 500 on.
 */
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
  'space-grotesk': '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const BOLD = 600;
const MEDIUM = 500;

type Advance = (codePoint: number) => number;

function lookup(face: FaceMetrics): Advance {
  const exceptions = new Map(face.exceptions);
  return (codePoint) => exceptions.get(codePoint) ?? face.advance;
}

function unpacked(face: PackedFace): Advance {
  const advances = unpackFace(face);
  return (codePoint) => advances.get(codePoint) ?? face.advance;
}

/** A bundled typeface: advances of its regular and its heavier face, the weight from which the heavier one sets. */
interface Face {
  readonly regular: Advance;
  readonly bold: Advance;
  readonly boldFrom: number;
  readonly unitsPerEm: number;
}

const FACES: Readonly<Record<Typeface, Face>> = {
  'jetbrains-mono': {
    regular: lookup(FONT_METRICS.regular),
    bold: lookup(FONT_METRICS.bold),
    boldFrom: BOLD,
    unitsPerEm: FONT_METRICS.unitsPerEm,
  },
  inter: {
    regular: unpacked(INTER_REGULAR),
    bold: unpacked(INTER_SEMIBOLD),
    boldFrom: BOLD,
    unitsPerEm: INTER_REGULAR.unitsPerEm,
  },
  'space-grotesk': {
    regular: unpacked(SPACE_GROTESK_REGULAR),
    bold: unpacked(SPACE_GROTESK_MEDIUM),
    boldFrom: MEDIUM,
    unitsPerEm: SPACE_GROTESK_REGULAR.unitsPerEm,
  },
};

/**
 * Width of a single line of text in pixels, rounded up, measured with the advances of the bundled typeface.
 * Same text, same number, in every runtime: no browser, no font loading. The sum runs glyph by glyph in the
 * order and floating point steps of opentype.js 2.0, which the predecessor used, so widths stay byte-identical.
 * Kerning is not counted, so pictures in a proportional face switch it off (ADR 0022); letter spacing is.
 */
export function textWidth(text: string, font: Font): number {
  const face = FACES[font.family ?? 'jetbrains-mono'];
  const advance = (font.weight ?? 0) >= face.boldFrom ? face.bold : face.regular;
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
