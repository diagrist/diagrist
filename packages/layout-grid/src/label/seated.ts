import { DEFAULT_THRESHOLDS, type Rect } from '@diagrist/core';
import { giveWay } from './give-way.js';
import type { Occupancy } from './occupancy.js';
import type { EdgeLabel } from './types.js';

/** The texts seated along lines so far, and the price of a box for how near it comes to those of other lines. */
export interface Seated {
  readonly crowd: (c: EdgeLabel) => number;
  readonly take: (c: EdgeLabel) => void;
  readonly drop: (c: EdgeLabel) => void;
}

/** A spot for a text and what it meets there: 0 where it is free. */
export interface Spot {
  readonly seat: EdgeLabel;
  readonly cost: number;
}

/** How a text is sought: the spot it would take now, and what a spot meets besides what the room holds. */
export interface Job {
  readonly seek: () => Spot | undefined;
  readonly extra: (c: EdgeLabel) => number;
  /** The spots it may take, in the order they are tried. */
  readonly candidates: readonly EdgeLabel[];
}

/** The distance between two rectangles, 0 for two that meet. */
const apart = (a: Rect, b: Rect): number =>
  Math.hypot(Math.max(0, b.x - a.x - a.w, a.x - b.x - b.w), Math.max(0, b.y - a.y - a.h, a.y - b.y - b.h));

/**
 * Texts seated one by one; a box costs, for each text of another line nearer than `labelClear`, the pixels it
 * lacks.
 */
export function seatedAlong(): Seated {
  const texts: EdgeLabel[] = [];
  return {
    crowd: (c) =>
      texts.reduce(
        (n, t) => n + (t.route === c.route ? 0 : Math.max(0, DEFAULT_THRESHOLDS.labelClear - apart(c.box, t.box))),
        0,
      ),
    take: (c) => {
      texts.push(c);
    },
    drop: (c) => {
      const i = texts.indexOf(c);
      if (i >= 0) texts.splice(i, 1);
    },
  };
}

/** Of the candidates that are `free`, the one that comes least near the texts of other lines, the first on a tie. */
export function leastCrowded(
  candidates: readonly EdgeLabel[],
  free: (c: EdgeLabel) => boolean,
  seated: Seated,
): EdgeLabel | undefined {
  let best: EdgeLabel | undefined;
  let near = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    if (!free(c)) continue;
    const k = seated.crowd(c);
    if (k < near) [best, near] = [c, k];
    if (near === 0) break;
  }
  return best;
}

/**
 * The texts of `jobs` seated one after the other, each taken in `room` and `seated`, then priced together: a text that
 * came near a text of another line is sought again with all others seated, so an earlier one gives way (`giveWay`).
 * In the order of `jobs`.
 */
export function seatTogether(jobs: readonly Job[], room: Occupancy, seated: Seated): EdgeLabel[] {
  const chosen = new Map<number, EdgeLabel>();
  const take = (k: number, c: EdgeLabel) => {
    room.take(c.box);
    seated.take(c);
    chosen.set(k, c);
  };
  jobs.forEach((job, k) => {
    const spot = job.seek();
    if (spot) take(k, spot.seat);
  });
  giveWay({
    chosen,
    near: (_, c) => seated.crowd(c),
    cost: (k, c) => room.cost(c.box) + (jobs[k]?.extra(c) ?? 0),
    seek: (k) => {
      const spot = jobs[k]?.seek();
      const now = chosen.get(k) as EdgeLabel;
      return spot ?? { seat: now, cost: Number.POSITIVE_INFINITY };
    },
    ways: (k) => {
      const job = jobs[k];
      return job ? job.candidates.filter((c) => room.cost(c.box) + job.extra(c) === 0) : [];
    },
    take,
    drop: (_, c) => {
      room.drop(c.box);
      seated.drop(c);
    },
  });
  return [...chosen.values()];
}
