import { describe, expect, it } from 'vitest';
import type { EdgeLabel } from '../src/label/types.js';
import { textBlocks } from '../src/layered/text-blocks.js';

const line = (route: number, x: number, y: number, w: number): EdgeLabel => ({
  text: '',
  x,
  y,
  anchor: 'start',
  box: { x, y, w, h: 14 },
  route,
  part: 'name',
});

describe('the texts the measure reads of a layered picture', () => {
  it('are one block per text, so a line through a column of ten empty lines counts once', () => {
    const column = Array.from({ length: 10 }, (_, i) => line(0, 100, 40 + i * 14, 30));
    expect(textBlocks(column)).toEqual([{ ...line(0, 100, 40, 30), box: { x: 100, y: 40, w: 30, h: 140 } }]);
  });

  it('keep the texts of different lines apart, around lines of unequal width', () => {
    const blocks = textBlocks([line(0, 100, 40, 30), line(1, 300, 40, 50), line(0, 90, 54, 60)]);
    expect(blocks.map((b) => b.box)).toEqual([
      { x: 90, y: 40, w: 60, h: 28 },
      { x: 300, y: 40, w: 50, h: 14 },
    ]);
  });
});
