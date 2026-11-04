import type { Rect } from '@diagrist/core';
import { describe, expect, it } from 'vitest';
import { type StackedLine, stackedPorts, stackedTracks } from '../src/index.js';

const box = (x: number, y: number, w: number): Rect => ({ x, y, w, h: 48 });

/** One wide box above three boxes, the middle one right under it, the outer ones beyond its ends. */
const rects = new Map<string, Rect>([
  ['top', box(200, 0, 160)],
  ['left', box(0, 120, 120)],
  ['middle', box(220, 120, 120)],
  ['right', box(440, 120, 120)],
]);
const lines: StackedLine[] = [
  { id: 'r', upper: 'top', lower: 'right' },
  { id: 'l', upper: 'top', lower: 'left' },
  { id: 'm', upper: 'top', lower: 'middle' },
];

describe('ports and tracks for boxes a kind placed itself', () => {
  it('orders the ends on a side by their other ends, apart by the gap, and lets a lone end follow', () => {
    const ports = stackedPorts(lines, rects, 16);
    const [l, m, r] = ['l', 'm', 'r'].map((id) => ports.bottom.get(id) ?? 0);
    expect(l).toBeLessThan(m as number);
    expect(m).toBeLessThan(r as number);
    expect((m as number) - (l as number)).toBeGreaterThanOrEqual(16);
    expect(ports.top.get('m')).toBe(m);
  });

  it('keeps ends as far off the corners as the caller says', () => {
    const narrow = new Map<string, Rect>([...rects, ['top', box(256, 0, 48)]]);
    const ports = stackedPorts(lines, narrow, 16, (r) => Math.min(16, r.w / 6));
    const xs = ['l', 'm', 'r'].map((id) => ports.bottom.get(id) ?? 0);
    expect(xs).toEqual([264, 280, 296]);
  });

  it('gives the steps of one gap tracks, and none to a straight line', () => {
    const ports = stackedPorts(lines, rects, 16);
    const { track, count } = stackedTracks(lines, ports);
    expect(track.has('m')).toBe(false);
    expect(count).toBe(1);
    expect(track.get('l')).toBe(0);
    expect(track.get('r')).toBe(0);
  });
});
