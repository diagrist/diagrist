import type { EdgeLabel } from '@diagrist/layout-grid';
import { describe, expect, it } from 'vitest';
import { gapShapes } from '../src/scene/labels/gap.js';

const label = (y: number): EdgeLabel => ({
  text: 'liest',
  x: 300,
  y,
  anchor: 'middle',
  box: { x: 280, y: y - 10, w: 40, h: 12 },
  route: 0,
  part: 'name',
});
const line = [
  [240, 260],
  [376, 260],
] as const;

describe('texts of the paper look on a gap', () => {
  it('cut the line behind them where they stand on it', () => {
    expect(gapShapes([label(264)], [], line).map((s) => s.kind)).toEqual(['rect', 'text']);
  });

  it('cut nothing where they stand beside their line', () => {
    expect(gapShapes([label(284)], [], line).map((s) => s.kind)).toEqual(['text']);
  });
});
