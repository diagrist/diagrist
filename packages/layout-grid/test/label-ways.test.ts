import { describe, expect, it } from 'vitest';
import type { Route } from '../src/index.js';
import { tiers } from '../src/label/ways.js';
import { METRICS } from './fixture.js';

const route: Route = {
  edge: 'x-y',
  points: [
    [100, 50],
    [400, 50],
  ],
  shape: 'straight',
  fromSide: 'right',
  toSide: 'left',
};
const pad = { x: 4, y: 2 };
const onLine = { onLine: { pad, avoid: [] }, preferFlat: true } as const;
const text = { edge: 'x-y', name: 'reads data' };

/** The least room the padded boxes of `block` keep from either end of the route. */
const endRoomOf = (block: readonly { readonly box: { readonly x: number; readonly w: number } }[]) =>
  Math.min(...block.flatMap(({ box }) => [box.x - pad.x - 100, 400 - box.x - box.w - pad.x]));

describe('the ways of a text on its line', () => {
  it('keep the lead of the metrics past the pad from either end of the piece first, and come nearer only after', () => {
    const [tight, later] = tiers(route, 0, text, { ...METRICS, lead: 24 }, onLine).map((t) => [...t]);
    expect(tight?.length).toBeGreaterThan(1);
    expect(Math.min(...(tight ?? []).map(endRoomOf))).toBeGreaterThanOrEqual(24);
    expect(Math.min(...(later ?? []).map(endRoomOf))).toBeLessThan(24);
    expect(Math.min(...(later ?? []).map(endRoomOf))).toBeGreaterThanOrEqual(12 - pad.x);
  });

  it('keep twelve pixels past the pad where the metrics give no lead', () => {
    const [tight] = tiers(route, 0, text, METRICS, onLine).map((t) => [...t]);
    expect(Math.min(...(tight ?? []).map(endRoomOf))).toBeGreaterThanOrEqual(12);
    expect(Math.min(...(tight ?? []).map(endRoomOf))).toBeLessThan(16);
  });

  it('have one tier beside their line', () => {
    expect(tiers(route, 0, text, { ...METRICS, lead: 24 }, { preferFlat: true })).toHaveLength(1);
  });
});
