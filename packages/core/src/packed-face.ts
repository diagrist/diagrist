/**
 * Advance widths of a proportional face, packed so a table of thousands of code points stays a short file
 * (ADR 0022). The strings of `runs` joined give runs separated by spaces; a run is its first code point in
 * hexadecimal, a colon, and the advances of that code point and each following one as three base-36 digits.
 */
export interface PackedFace {
  readonly unitsPerEm: number;
  /** Advance of every code point not listed, the one of glyph 0. */
  readonly advance: number;
  readonly runs: readonly string[];
}

const DIGITS = 3;

/** The advances of a packed face by code point, in font units. */
export function unpackFace(face: PackedFace): Map<number, number> {
  const advances = new Map<number, number>();
  for (const run of face.runs.join('').split(' ')) {
    const [start = '', packed = ''] = run.split(':');
    const first = Number.parseInt(start, 16);
    for (let i = 0; i < packed.length / DIGITS; i++)
      advances.set(first + i, Number.parseInt(packed.slice(i * DIGITS, (i + 1) * DIGITS), 36));
  }
  return advances;
}
