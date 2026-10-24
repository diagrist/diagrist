/**
 * Just enough of the TrueType format to read advance widths: `head` for units per em, `hhea` and `hmtx` for
 * advances, `cmap` format 12 for code points, or format 4 where a font has no 12, as Space Grotesk. Used to derive
 * the metrics tables in `src` from the bundled fonts.
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
  for (const [codePoint, glyph] of unicodeMap(view, offset('cmap'))) byCodePoint.set(codePoint, advanceOf(glyph));
  return { unitsPerEm: view.getUint16(offset('head') + 18), byCodePoint, missing: advanceOf(0) };
}

/** The Windows Unicode subtable of `cmap` with the given encoding and format, or nothing. */
function subtable(view: DataView, cmap: number, encoding: number, format: number): number | undefined {
  for (let i = 0; i < view.getUint16(cmap + 2); i++) {
    const record = cmap + 4 + 8 * i;
    const table = cmap + view.getUint32(record + 4);
    if (view.getUint16(record) === 3 && view.getUint16(record + 2) === encoding && view.getUint16(table) === format)
      return table;
  }
  return undefined;
}

function* unicodeMap(view: DataView, cmap: number): Generator<[number, number]> {
  const full = subtable(view, cmap, 10, 12);
  if (full !== undefined) {
    for (let g = 0; g < view.getUint32(full + 12); g++) {
      const group = full + 16 + 12 * g;
      const [first, last, glyph] = [view.getUint32(group), view.getUint32(group + 4), view.getUint32(group + 8)];
      for (let c = first; c <= last; c++) yield [c, glyph + c - first];
    }
    return;
  }
  const basic = subtable(view, cmap, 1, 4);
  if (basic === undefined) throw new Error('font has no cmap format 12 or 4 for Unicode');
  yield* segments(view, basic);
}

/** The segments of a `cmap` format 4 subtable: ranges with a delta or an offset into the glyph array. */
function* segments(view: DataView, table: number): Generator<[number, number]> {
  const count = view.getUint16(table + 6) / 2;
  const ends = table + 14;
  const starts = ends + 2 * count + 2;
  const deltas = starts + 2 * count;
  const offsets = deltas + 2 * count;
  for (let s = 0; s < count; s++) {
    const [start, end] = [view.getUint16(starts + 2 * s), view.getUint16(ends + 2 * s)];
    const delta = view.getInt16(deltas + 2 * s);
    const offset = view.getUint16(offsets + 2 * s);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      const raw = offset === 0 ? c : view.getUint16(offsets + 2 * s + offset + 2 * (c - start));
      const glyph = offset !== 0 && raw === 0 ? 0 : (raw + delta) & 0xffff;
      if (glyph !== 0) yield [c, glyph];
    }
  }
}
