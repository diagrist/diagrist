import { describe, expect, it } from 'vitest';
import type { Route } from '../src/index.js';
import { tiers } from '../src/label/ways.js';
import { METRICS as GRID } from './fixture.js';

const route: Route = {
  edge: 'x-y',
  points: [
    [100, 0],
    [100, 40],
    [400, 40],
  ],
  shape: 'orthogonal',
  fromSide: 'bottom',
  toSide: 'left',
};

/** The middle of the box of the first text of the first way of `tiers`. */
const firstAt = (at?: 'start' | 'middle') => {
  const [first] = tiers(route, 0, { edge: 'x-y', name: 'ja', ...(at ? { at } : {}) }, GRID, { preferFlat: false });
  const box = first?.next().value?.[0]?.box ?? { x: 0, y: 0, w: 0, h: 0 };
  return [box.x + box.w / 2, box.y + box.h / 2];
};

describe('a text that belongs at the start of its line', () => {
  it('is sought along the pieces in the order of the line, each from its start', () => {
    const [x, y] = firstAt('start');
    expect(Math.abs((x ?? 0) - 100)).toBeLessThan(40);
    expect(y).toBeLessThan(20);
  });

  it('while any other text is sought from the middle of the longest piece', () => {
    const [x] = firstAt();
    expect(x).toBeCloseTo(250, 0);
  });
});
