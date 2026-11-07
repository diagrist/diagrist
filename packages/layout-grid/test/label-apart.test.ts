import type { Point } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import type { EdgeLabel, Route } from '../src/index.js';
import { apartOf } from '../src/label/apart.js';
import { bentPorts } from '../src/route/channel/train.js';
import { METRICS } from './fixture.js';

const pad = { x: 4, y: 4 };
const onLine = { pad, avoid: [] };
const metrics = { ...METRICS, lead: 24 };

const route = (edge: string, y: number): Route => ({
  edge,
  points: [
    [0, y],
    [216, y],
  ] as Point[],
  shape: 'straight',
  fromSide: 'right',
  toSide: 'left',
});

/** A block of two lines, 100 wide, centred on `y` and starting at `x`. */
const block = (route: number, x: number, y: number): EdgeLabel[] =>
  [0, 1].map((k) => ({
    text: `line ${k}`,
    x,
    y,
    anchor: 'start',
    box: { x, y: y - 12 + 12 * k, w: 100, h: 12 },
    route,
    part: k === 0 ? 'name' : 'detail',
  }));

describe('lines whose texts stand squeezed between them', () => {
  const routes = [route('a', 100), route('b', 132)];

  it('ask to run so far apart that the two blocks stand one beside the other across them', () => {
    const squeezed = [...block(0, 110, 100), ...block(1, 10, 132)];
    const need = Math.ceil(((32 + 32) / 2 + 3) / METRICS.grid) * METRICS.grid;
    expect(apartOf(routes, squeezed, metrics, onLine)).toEqual(
      new Map([
        ['a', need],
        ['b', need],
      ]),
    );
  });

  it('ask nothing where each block keeps the lead from the ends of its piece, or without a lead', () => {
    const roomy = [...block(0, 58, 100), ...block(1, 58, 132)];
    expect(apartOf(routes, roomy, metrics, onLine).size).toBe(0);
    expect(apartOf(routes, [...block(0, 110, 100), ...block(1, 10, 132)], METRICS, onLine).size).toBe(0);
  });

  it('ask nothing of lines already far enough apart', () => {
    const far = [route('a', 100), route('b', 164)];
    expect(apartOf(far, [...block(0, 110, 100), ...block(1, 10, 164)], metrics, onLine).size).toBe(0);
  });
});

describe('a train of ends that asks to stand apart', () => {
  const pair = (apart?: number) => [0, 1].map(() => ({ other: 0, pair: 'a|b', ...(apart ? { apart } : {}) }));

  it('stands as far apart as both ends ask where the side holds it', () => {
    const { spots } = bentPorts(pair(40), [], [], [[0, 100]], 16);
    expect((spots[1] ?? 0) - (spots[0] ?? 0)).toBe(40);
  });

  it('stands as if it asked nothing where the side does not hold it', () => {
    expect(bentPorts(pair(48), [], [], [[0, 40]], 16)).toEqual(bentPorts(pair(), [], [], [[0, 40]], 16));
  });
});
