import type { Point } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { linesOfLaid, type Route, scoreOf } from '../src/index.js';

const node = (id: string, x: number, y: number) => ({ id, rect: { x, y, w: 80, h: 40 }, col: 0, row: 0 });
const route = (edge: string, ...points: Point[]): Route => ({
  edge,
  points,
  shape: 'orthogonal',
  fromSide: 'bottom',
  toSide: 'top',
});
const nodes = [node('a', 0, 0), node('b', 200, 0), node('c', 0, 200), node('d', 200, 200)];
const picture = (routes: readonly Route[], ends: readonly (readonly [string, string])[]) =>
  linesOfLaid({ nodes, routes, ends, labels: [], width: 280, height: 240 });

describe('the score of a laid out picture', () => {
  const straight = [route('1', [40, 40], [40, 200]), route('2', [240, 40], [240, 200])];
  const crossed = [
    route('1', [40, 40], [40, 120], [240, 120], [240, 200]),
    route('2', [240, 40], [240, 80], [140, 80], [140, 160], [40, 160], [40, 200]),
  ];

  it('prices a crossing above the bends and length of a straight picture, and calls only that one clean', () => {
    const plain = scoreOf(
      picture(straight, [
        ['a', 'c'],
        ['b', 'd'],
      ]),
    );
    const tangled = scoreOf(
      picture(crossed, [
        ['a', 'd'],
        ['b', 'c'],
      ]),
    );
    expect(plain.clean).toBe(true);
    expect(tangled.clean).toBe(false);
    expect(tangled.metrics.crossings).toBe(1);
    expect(tangled.cost - plain.cost).toBeGreaterThan(1000);
  });

  it('prices a line through a foreign box above a crossing', () => {
    const through = scoreOf(picture([route('1', [40, 40], [40, 220], [200, 220])], [['a', 'd']]));
    expect(through.clean).toBe(false);
    expect(through.cost).toBeGreaterThan(10_000);
  });

  it('reads lines that leave one box at one point as a bundle, as the line check reads the drawing', () => {
    const fan = [route('1', [40, 40], [40, 120], [240, 120], [240, 200]), route('2', [40, 40], [40, 200])];
    const input = picture(fan, [
      ['a', 'd'],
      ['a', 'c'],
    ]);
    expect(input.routes.map((r) => r.bundles)).toEqual([['at 40.0,40.0'], ['at 40.0,40.0']]);
    expect(scoreOf(input).metrics.overlaps).toBe(0);
  });
});
