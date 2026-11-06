import { describe, expect, it } from 'vitest';
import { assignTracks, type TrackPiece } from '../src/index.js';
import { greedyOrder, meeting } from '../src/layered/track-order.js';

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

/** Spans spread along a gap, many alike so ties happen, the same for the same seed. */
function spread(n: number, seed: number) {
  let s = seed;
  const next = (m: number) => {
    s = (s * 48271) % 2147483647;
    return s % m;
  };
  return Array.from({ length: n }, (_, i) => {
    const [a, b] = [next(60) * 20, next(60) * 20];
    return { x1: Math.min(a, b), x2: Math.max(a, b) + 1, near: next(3) * 40, tag: i % 5 };
  });
}

type Spread = ReturnType<typeof spread>[number];
const meets = (a: Spread, b: Spread) =>
  a.x1 < b.x2 + Math.max(a.near, b.near) && b.x1 < a.x2 + Math.max(a.near, b.near);
const weigh = (a: Spread, b: Spread) => (a.tag - b.tag) * ((a.x1 + b.x2) % 3);

/** The greedy order with every cost counted afresh at every step, as `assignTracks` once did. */
function freshOrder(spans: readonly Spread[]): number[] {
  const left = spans.map((_, i) => i);
  const order: number[] = [];
  while (left.length > 0) {
    const cost = (i: number) =>
      left.reduce(
        (sum, j) =>
          sum +
          (j !== i && meets(spans[i] as Spread, spans[j] as Spread)
            ? weigh(spans[i] as Spread, spans[j] as Spread)
            : 0),
        0,
      );
    const best = [...left].sort(
      (a, b) =>
        cost(a) - cost(b) ||
        (spans[a] as Spread).x1 - (spans[b] as Spread).x1 ||
        (spans[a] as Spread).x2 - (spans[b] as Spread).x2,
    )[0] as number;
    order.push(best);
    left.splice(left.indexOf(best), 1);
  }
  return order;
}

describe('the order of tracks in a crowded gap', () => {
  it.each([1, 2, 3])('finds the pairs that meet by a sweep, as testing every pair would (seed %i)', (seed) => {
    const spans = spread(80, seed);
    const all = spans.map((a, i) => spans.flatMap((b, j) => (j !== i && meets(a, b) ? [j] : [])));
    expect(meeting(spans, meets, 80)).toEqual(all);
  });

  it.each([1, 2, 3])('keeps the costs as spans leave and orders as counting afresh would (seed %i)', (seed) => {
    const spans = spread(80, seed);
    expect(greedyOrder(spans, meeting(spans, meets, 80), weigh)).toEqual(freshOrder(spans));
  });
});
