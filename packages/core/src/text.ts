import { type FaceMetrics, FONT_METRICS } from './font-metrics.js';

/** How a text is set: size in pixels and CSS weight (400 regular, 600 and above bold). */
export interface Font {
  readonly size: number;
  readonly weight?: number;
}

const BOLD = 600;

const faces = {
  regular: lookup(FONT_METRICS.regular),
  bold: lookup(FONT_METRICS.bold),
};

function lookup(face: FaceMetrics): (codePoint: number) => number {
  const exceptions = new Map(face.exceptions);
  return (codePoint) => exceptions.get(codePoint) ?? face.advance;
}

/**
 * Width of a single line of text in pixels, rounded up, measured with the bundled JetBrains Mono metrics.
 * Same text, same number, in every runtime: no browser, no font loading. The sum runs glyph by glyph in the
 * order and floating point steps of opentype.js 2.0, which the predecessor used, so widths stay byte-identical.
 */
export function textWidth(text: string, font: Font): number {
  const advance = (font.weight ?? 0) >= BOLD ? faces.bold : faces.regular;
  const scale = (1 / FONT_METRICS.unitsPerEm) * font.size;
  let width = 0;
  for (const char of text) {
    const units = advance(char.codePointAt(0) ?? 0);
    if (units !== 0) width += units * scale;
  }
  return Math.ceil(width);
}
