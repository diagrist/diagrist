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

  it('prices two lines on one another above several hundred pixels of line that would keep them apart', () => {
    const first = route('1', [40, 40], [40, 120], [240, 120], [240, 200]);
    const on = [first, route('2', [20, 40], [20, 120], [220, 120], [220, 200])];
    const apart = [first, route('2', [20, 40], [20, 140], [220, 140], [220, 200])];
    const ends: [string, string][] = [
      ['a', 'd'],
      ['a', 'd'],
    ];
    const overlapping = scoreOf(picture(on, ends));
    const kept = scoreOf(picture(apart, ends));
    expect([overlapping.metrics.overlaps, kept.metrics.overlaps, kept.metrics.crossings]).toEqual([1, 0, 0]);
    expect(overlapping.cost - kept.cost).toBeGreaterThan(0.1 * 500);
  });

  it('weighs a bend by the weight of its line, so a soft line bends before a main one', () => {
    const bent = [route('1', [40, 40], [40, 120], [240, 120], [240, 200])];
    const at = (weight: number) =>
      scoreOf(
        linesOfLaid({
          nodes,
          routes: bent,
          ends: [['a', 'd']],
          weights: [weight],
          labels: [],
          width: 280,
          height: 240,
        }),
      );
    expect(at(2).cost).toBeGreaterThan(at(1).cost);
    expect(at(1).cost).toBeGreaterThan(at(0.5).cost);
  });

  it('prices a child off its one parent by the lines that are no soft ones', () => {
    const under = (x: number, weight: number) =>
      scoreOf(
        linesOfLaid({
          nodes: [node('a', 0, 0), node('c', x, 200)],
          routes: [route('1', [40, 40], [40, 120], [x + 40, 120], [x + 40, 200])],
          ends: [['a', 'c']],
          weights: [weight],
          labels: [],
          width: 400,
          height: 240,
        }),
      ).cost;
    expect(under(100, 1) - under(60, 1)).toBeGreaterThan(15);
    expect(under(100, 0.5) - under(60, 0.5)).toBeLessThan(10);
  });
});
