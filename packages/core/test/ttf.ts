/**
 * Just enough of the TrueType format to read advance widths: `head` for units per em, `hhea` and `hmtx` for
 * advances, `cmap` format 12 for code points. Used to derive `src/font-metrics.ts` from the bundled fonts.
 */
export interface Advances {
  readonly unitsPerEm: number;
  /** Advance in font units by code point, for every code point the font maps. */
  readonly byCodePoint: ReadonlyMap<number, number>;
  /** Advance of glyph 0, which stands in for unmapped code points. */
  readonly missing: number;
}

export function readAdvances(font: Uint8Array): Advances {
  const view = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const tables = new Map<string, number>();
  for (let i = 0; i < view.getUint16(4); i++) {
    const at = 12 + 16 * i;
    const tag = String.fromCharCode(...font.subarray(at, at + 4));
    tables.set(tag, view.getUint32(at + 8));
  }
  const offset = (tag: string): number => {
    const found = tables.get(tag);
    if (found === undefined) throw new Error(`font has no ${tag} table`);
    return found;
  };
  const metrics = view.getUint16(offset('hhea') + 34);
  const hmtx = offset('hmtx');
  const advanceOf = (glyph: number) => view.getUint16(hmtx + 4 * Math.min(glyph, metrics - 1));
  const byCodePoint = new Map<number, number>();
  for (const [codePoint, glyph] of codePoints(view, offset('cmap'))) byCodePoint.set(codePoint, advanceOf(glyph));
  return { unitsPerEm: view.getUint16(offset('head') + 18), byCodePoint, missing: advanceOf(0) };
}

/** The Unicode subtable of `cmap`: format 12 when the font has one, else format 4, which covers only the BMP. */
function codePoints(view: DataView, cmap: number): Generator<[number, number]> {
  const records = Array.from({ length: view.getUint16(cmap + 2) }, (_, i) => cmap + 4 + 8 * i);
  const subtable = (encoding: number, format: number) =>
    records
      .filter((r) => view.getUint16(r) === 3 && view.getUint16(r + 2) === encoding)
      .map((r) => cmap + view.getUint32(r + 4))
      .find((table) => view.getUint16(table) === format);
  const full = subtable(10, 12);
  if (full !== undefined) return cmap12(view, full);
  const basic = subtable(1, 4);
  if (basic !== undefined) return cmap4(view, basic);
  throw new Error('font has no cmap format 12 or 4 for Unicode');
}

function* cmap12(view: DataView, table: number): Generator<[number, number]> {
  for (let g = 0; g < view.getUint32(table + 12); g++) {
    const group = table + 16 + 12 * g;
    const [first, last, glyph] = [view.getUint32(group), view.getUint32(group + 4), view.getUint32(group + 8)];
    for (let c = first; c <= last; c++) yield [c, glyph + c - first];
  }
}

/** Segments of format 4: end codes, start codes, deltas and offsets into the glyph array, each `segments` long. */
function* cmap4(view: DataView, table: number): Generator<[number, number]> {
  const segments = view.getUint16(table + 6) / 2;
  const ends = table + 14;
  const starts = ends + 2 * segments + 2;
  const deltas = starts + 2 * segments;
  const ranges = deltas + 2 * segments;
  for (let s = 0; s < segments; s++) {
    const [first, last] = [view.getUint16(starts + 2 * s), view.getUint16(ends + 2 * s)];
    const [delta, range] = [view.getUint16(deltas + 2 * s), view.getUint16(ranges + 2 * s)];
    for (let c = first; c <= last && c !== 0xffff; c++) {
      const at = ranges + 2 * s + range + 2 * (c - first);
      const glyph = range === 0 ? c + delta : view.getUint16(at) === 0 ? 0 : view.getUint16(at) + delta;
      if (glyph % 0x10000 !== 0) yield [c, glyph % 0x10000];
    }
  }
}
