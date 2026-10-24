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
  for (const [codePoint, glyph] of cmap12(view, offset('cmap'))) byCodePoint.set(codePoint, advanceOf(glyph));
  return { unitsPerEm: view.getUint16(offset('head') + 18), byCodePoint, missing: advanceOf(0) };
}

function* cmap12(view: DataView, cmap: number): Generator<[number, number]> {
  for (let i = 0; i < view.getUint16(cmap + 2); i++) {
    const record = cmap + 4 + 8 * i;
    const table = cmap + view.getUint32(record + 4);
    if (view.getUint16(record) !== 3 || view.getUint16(record + 2) !== 10 || view.getUint16(table) !== 12) continue;
    for (let g = 0; g < view.getUint32(table + 12); g++) {
      const group = table + 16 + 12 * g;
      const [first, last, glyph] = [view.getUint32(group), view.getUint32(group + 4), view.getUint32(group + 8)];
      for (let c = first; c <= last; c++) yield [c, glyph + c - first];
    }
    return;
  }
  throw new Error('font has no cmap format 12 for Unicode');
}
