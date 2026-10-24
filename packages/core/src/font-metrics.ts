/**
 * Advance widths of JetBrains Mono 2.305 (SIL Open Font License 1.1, see `fonts/OFL.txt`) in font units.
 * Generated from `fonts/JetBrainsMono-Regular.ttf` and `fonts/JetBrainsMono-Bold.ttf` by
 * `test/font-metrics.test.ts`; run it with `UPDATE_GOLDEN=1` instead of editing this file. The italic faces
 * have the advances of their upright ones, which the same test checks, so italic text is measured with these.
 */
export interface FaceMetrics {
  /** Advance of every code point not listed, including those the font does not map. */
  readonly advance: number;
  readonly exceptions: readonly (readonly [number, number])[];
}

/** Units per em and advances of the regular and the bold face. */
export const FONT_METRICS: {
  readonly unitsPerEm: number;
  readonly regular: FaceMetrics;
  readonly bold: FaceMetrics;
} = {
  unitsPerEm: 1000,
  regular: {
    advance: 600,
    exceptions: [
      [0x300, 0],
      [0x301, 0],
      [0x302, 0],
      [0x303, 0],
      [0x304, 0],
      [0x306, 0],
      [0x307, 0],
      [0x308, 0],
      [0x309, 0],
      [0x30a, 0],
      [0x30b, 0],
      [0x30c, 0],
      [0x30f, 0],
      [0x312, 0],
      [0x31b, 0],
      [0x323, 0],
      [0x325, 0],
      [0x326, 0],
      [0x327, 0],
      [0x328, 0],
      [0x336, 0],
      [0x337, 0],
      [0x338, 0],
      [0xfeff, 0],
    ],
  },
  bold: {
    advance: 600,
    exceptions: [
      [0x300, 0],
      [0x301, 0],
      [0x302, 0],
      [0x303, 0],
      [0x304, 0],
      [0x306, 0],
      [0x307, 0],
      [0x308, 0],
      [0x309, 0],
      [0x30a, 0],
      [0x30b, 0],
      [0x30c, 0],
      [0x30f, 0],
      [0x312, 0],
      [0x31b, 0],
      [0x323, 0],
      [0x325, 0],
      [0x326, 0],
      [0x327, 0],
      [0x328, 0],
      [0x336, 0],
      [0x337, 0],
      [0x338, 0],
      [0xfeff, 351],
    ],
  },
};
