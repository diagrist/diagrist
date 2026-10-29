import { describe, expect, it } from 'vitest';
import { placeTable, type SideEntry, type TableSpec } from '../src/index.js';

const metrics = { lineHeight: 14, cell: { w: 40, h: 28 }, pad: { x: 8, y: 6 } };

const line = (key: string, width: number, lines = 1): SideEntry => ({ kind: 'line', key, head: { width, lines } });
const band = (key: string, width: number): SideEntry => ({ kind: 'band', key, head: { width, lines: 1 } });

const spec = (over: Partial<TableSpec> = {}): TableSpec => ({
  x: 32,
  y: 60,
  top: [
    { key: 'a', head: { width: 30, lines: 1 } },
    { key: 'b', head: { width: 70, lines: 2 } },
  ],
  side: [line('one', 100), line('two', 60, 3)],
  metrics,
  ...over,
});

describe('placeTable', () => {
  it('makes every cell as wide as the widest top head asks, and the top as tall as the tallest head', () => {
    const table = placeTable(spec());
    expect(table.top.map((t) => t.rect.w)).toEqual([86, 86]);
    expect(table.top.map((t) => t.rect.h)).toEqual([40, 40]);
    expect(new Set(table.cells.map((c) => c.rect.w))).toEqual(new Set([86]));
  });

  it('keeps the least cell size when the heads are small', () => {
    const table = placeTable(spec({ top: [{ key: 'a', head: { width: 4, lines: 1 } }], side: [line('one', 4)] }));
    expect(table.cells[0]?.rect).toMatchObject({ w: 40, h: 28 });
  });

  it('stands the side heads in one column as wide as the widest, and a line as tall as its head', () => {
    const table = placeTable(spec());
    expect(table.side.map((s) => [s.rect.x, s.rect.w])).toEqual([
      [32, 116],
      [32, 116],
    ]);
    expect(table.side.map((s) => s.rect.h)).toEqual([28, 54]);
    expect(table.body).toEqual({ x: 148, y: 100, w: 172, h: 82 });
  });

  it('draws a band across the whole width without cells, and the lines below it continue the cells', () => {
    const table = placeTable(spec({ side: [band('g', 40), line('one', 100)] }));
    expect(table.side[0]).toEqual({ kind: 'band', key: 'g', rect: { x: 32, y: 100, w: 288, h: 26 } });
    expect(table.cells.map((c) => [c.top, c.line, c.rect.y])).toEqual([
      ['a', 'one', 126],
      ['b', 'one', 126],
    ]);
  });

  it('widens the side heads when a band is wider than the whole table', () => {
    const table = placeTable(spec({ side: [band('g', 400), line('one', 10)] }));
    expect(table.frame.w).toBe(416);
    expect(table.body.x - table.frame.x).toBe(416 - 172);
  });
});
