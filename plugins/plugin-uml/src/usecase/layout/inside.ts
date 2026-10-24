import type { Rect } from '@diagrist/core';
import type { EdgeLabel, Occupancy } from '@diagrist/layout-grid';
import { distance, type Line } from './line.js';

/** Least distance of the text from the line of the frame. */
const PAD = 2;
/** Steps back along the line (negative: beside the use case instead of before it) and further aside. */
const ALONG = [1, 0.5, 0, -8, -16, -24, -32];
const ASIDE = [0, 8, 16, 24, 32];

const within = (b: Rect, f: Rect) =>
  b.x >= f.x + PAD && b.y >= f.y + PAD && b.x + b.w <= f.x + f.w - PAD && b.y + b.h <= f.y + f.h - PAD;

/**
 * The multiplicity at a use case whose frame the line crosses stands inside the frame; outside it would read as the
 * one of the actor. First the first free of the usual candidates inside the frame, then, when the frame lies close
 * before the use case, a spot beside the end of the line. Undefined without a free spot inside. The text stays
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
): EdgeLabel | undefined {
  const mine = (c: EdgeLabel) => {
    const p = [c.box.x + c.box.w / 2, c.box.y + c.box.h / 2] as const;
    const d = distance(p, own);
    return others.every((l) => distance(p, l) > d);
  };
  const free = (c: EdgeLabel) => within(c.box, frame) && room.cost(c.box) === 0 && mine(c);
  const near = candidates.find(free);
  if (near) return near;
  const beside = ALONG.flatMap((a) =>
    ASIDE.flatMap((more) => [-1, 1].map((side) => put(a > 0 ? reach.back * a : a, (reach.aside + more) * side))),
  );
  return beside.find(free);
}
