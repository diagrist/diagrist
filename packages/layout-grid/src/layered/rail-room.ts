import type { Rect } from '@diagrist/core';
import type { RailSide } from './rail-order.js';
import type { RailTextAt } from './rail-texts.js';
import type { LayeredEdge } from './spec.js';

/**
 * The stretch a rail between `upper` and `lower` takes on its track: from the middle of one box to the middle of the
 * other, where its ends dock, and a text beside the middle of the track. A text over the upper end or under the lower
 * adds nothing: it stands on its end piece, and the rails placed after it keep clear of it as a box (`pieceText`).
 */
export function stretch(e: LayeredEdge, upper: Rect, lower: Rect, text: RailTextAt): { lo: number; hi: number } {
  const [lo, hi] = [upper.y + upper.h / 2, lower.y + lower.h / 2];
  if (e.label === undefined || text !== 'beside') return { lo, hi };
  const half = ((e.label.lines?.length ?? 1) * e.label.size * 1.5) / 2;
  const mid = (lo + hi) / 2;
  return { lo: Math.min(lo, mid - half), hi: Math.max(hi, mid + half) };
}

/**
 * The rails of `rest`, still to come, whose side is settled, each with that side and its stretch: placed later, each
 * runs outside a rail placed now and crosses its pieces unless its stretch holds the stretch of the one placed now.
 */
export function ahead(
  rest: readonly LayeredEdge[],
  at: { readonly boxes: ReadonlyMap<string, Rect>; readonly sides: ReadonlyMap<string, readonly RailSide[]> },
  layer: (node: string) => number,
  text: (e: LayeredEdge) => RailTextAt,
): { readonly side: RailSide; readonly lo: number; readonly hi: number }[] {
  return rest.flatMap((o) => {
    const [a, b] = [at.boxes.get(o.from), at.boxes.get(o.to)];
    const sides = at.sides.get(o.id) ?? ['left'];
    const side = sides.length === 1 ? sides[0] : undefined;
    if (a === undefined || b === undefined || side === undefined) return [];
    const [upper, lower] = layer(o.from) < layer(o.to) ? [a, b] : [b, a];
    return [{ side, ...stretch(o, upper, lower, text(o)) }];
  });
}

/** How far the texts of other lines, at their seats (`seated`), reach towards `side` between `top` and `bottom`. */
export function texts(seats: readonly Rect[], side: RailSide, top: number, bottom: number): number[] {
  return seats.flatMap((r) => (r.y < bottom && r.y + r.h > top ? [side === 'left' ? r.x : r.x + r.w] : []));
}
