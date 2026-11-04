import { describe, expect, it } from 'vitest';
import { assignTracks, type TrackPiece } from '../src/index.js';

const piece = (x1: number, x2: number, tops: number[], bottoms: number[]): TrackPiece => ({
  x1,
  x2,
  tops,
  bottoms,
  track: 0,
});

describe('tracks in a gap', () => {
  /**
   * Three lines into one box: `left` and `middle` come from the left, `right` from just right of where `middle`
   * goes down. `middle` must run above `left`, or each crosses the other's vertical.
   */
  const pieces = () => ({
    left: piece(100, 327, [100], [327]),
    middle: piece(196, 409, [196], [409]),
    right: piece(414, 467, [414], [467]),
  });

  it('without `apart`, lets the line going down at 409 run above the one coming down at 414, side by side', () => {
    const p = pieces();
    expect(assignTracks(Object.values(p))).toBe(2);
    expect(p.middle.track).toBeLessThan(p.right.track);
  });

  it('with `apart`, puts the line coming down at 414 above, so the two verticals never run side by side', () => {
    const p = pieces();
    expect(assignTracks(Object.values(p), 12)).toBe(3);
    expect([p.right.track, p.middle.track, p.left.track]).toEqual([0, 1, 2]);
  });
});
