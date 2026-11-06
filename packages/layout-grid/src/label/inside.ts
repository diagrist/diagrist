import type { Rect } from '@diagrist/core';
import { distance, type Line } from './line.js';
import type { Occupancy } from './occupancy.js';
import type { EdgeLabel } from './types.js';

/** Least distance of the text from the line of the frame. */
const PAD = 2;
/** Steps back along the line (negative: beside the box at the end instead of before it) and further aside. */
const ALONG = [1, 0.5, 0, -8, -16, -24, -32];
const ASIDE = [0, 8, 16, 24, 32];

const within = (b: Rect, f: Rect) =>
  b.x >= f.x + PAD && b.y >= f.y + PAD && b.x + b.w <= f.x + f.w - PAD && b.y + b.h <= f.y + f.h - PAD;

/**
 * A text at the end of a line inside the frame the line leaves near that end; outside it would read as the text of
 * the other end. First the first free of the usual candidates inside the frame that is `clear`, then, when the frame
 * lies close before the end, a spot beside the end of the line. Undefined without a free spot inside. The text stays
 * nearer to its own line than to any other, else it would seem to belong to the neighbour.
 */
export function insideFrame(
  candidates: readonly EdgeLabel[],
  frame: Rect,
  room: Occupancy,
  put: (along: number, across: number) => EdgeLabel,
  reach: { readonly back: number; readonly aside: number },
  own: Line,
  others: readonly Line[],
  clear: (c: EdgeLabel) => boolean,
): EdgeLabel | undefined {
  const mine = (c: EdgeLabel) => {
    const p = [c.box.x + c.box.w / 2, c.box.y + c.box.h / 2] as const;
    const d = distance(p, own);
    return others.every((l) => distance(p, l) > d);
  };
  const free = (c: EdgeLabel) => within(c.box, frame) && room.cost(c.box) === 0 && clear(c) && mine(c);
  const near = candidates.find(free);
  if (near) return near;
  const beside = ALONG.flatMap((a) =>
    ASIDE.flatMap((more) => [-1, 1].map((side) => put(a > 0 ? reach.back * a : a, (reach.aside + more) * side))),
  );
  return beside.find(free);
}
