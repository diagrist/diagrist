import type { Rect } from '@diagrist/core';
import { isotoneApart } from './isotone.js';
import type { Link } from './links.js';

/**
 * One end on a side of a box: the pieces that leave or reach it there together, where the end would stand
 * (`toward`), and where the far ends of its pieces are (`beyond`), which orders the ends of a side. The two differ for
 * the members of a fan or join, which aim straight at their own box but come from the trunk.
 */
export interface End {
  readonly links: readonly Link[];
  readonly toward: number;
  readonly beyond: number;
  /** How hard the end holds to `toward`: little for a member of a fan or join, which comes from its trunk. */
  readonly hold: number;
  /** The room the end takes along the side to its right (`Link.slot`), where its kind draws something there. */
  readonly slot?: number;
}

/** How near a corner an end may come: when that spares its line a small jog, or when the corner is square. */
export const CORNER = 4;

/**
 * Where the ends of one side of `r` stand, in their order: each as near its `toward` as the side between `inset`
 * from its corners and a gap of `gap` between ends allow (`isotoneApart`), the row then shifted back between the
 * insets (`shifted`). An end the shift pushes past an inset stays off its corner by the radius of the box's corners
 * (`corner`), at least `CORNER` and at most `inset`: on a rounded corner it would stand on the rounding, while on a
 * square one an end 8 px from the corner reads as clearly as one 16 px away. A box of unknown corners keeps `inset`.
 * Two neighbouring ends that both carry a `slot` stand at least the left one's slot apart, so what their kind draws
 * at them does not overlap; beside an end without one the gap stays, since what is drawn there may turn to the other
 * side; where the slots do not fit between the insets, the gap stays everywhere. `apart` holds the least distance
 * from each end to the next.
 */
export function rowOf(
  sorted: readonly End[],
  r: Rect,
  inset: number,
  gap: number,
  corner: number = inset,
): { readonly at: number[]; readonly apart: number[] } {
  const [lo, hi] = [r.x + inset, r.x + r.w - inset];
  const step = sorted.length < 2 ? 0 : Math.min(gap, (hi - lo) / (sorted.length - 1));
  const slotted = sorted.slice(1).map((e, i) => {
    const left = sorted[i]?.slot;
    return e.slot !== undefined && left !== undefined ? Math.max(step, left) : step;
  });
  const apart = slotted.reduce((a, d) => a + d, 0) <= hi - lo ? slotted : slotted.map(() => step);
  const wanted = sorted.map((e) => Math.min(hi, Math.max(lo, e.toward)));
  const placed = isotoneApart(
    wanted,
    sorted.map((e) => e.hold),
    apart,
  );
  const moved = shifted(sorted, placed, lo, hi, apart);
  const edge = Math.min(inset, Math.max(CORNER, corner));
  const [first, last] = [r.x + edge, r.x + r.w - edge];
  const total = apart.reduce((a, d) => a + d, 0);
  let ahead = 0;
  const at = moved.map((p, i) => {
    const placedAt = Math.round(Math.min(last - (total - ahead), Math.max(first + ahead, p)));
    ahead += apart[i] ?? 0;
    return placedAt;
  });
  return { at, apart };
}

/**
 * The row of `placed` shifted back between `lo` and `hi` where spreading pushed it past one of them: the shift moves
 * the ends that wanted a place beyond the box, and an end that wanted a place on it only as far as the gap `apart` to
 * a moved neighbour asks. So an end that stands where its line wants stays there when its neighbours, which come from
 * beyond the box, are spread around the inset.
 */
function shifted(sorted: readonly End[], placed: readonly number[], lo: number, hi: number, apart: readonly number[]) {
  const shift = Math.min(0, hi - (placed.at(-1) ?? hi)) + Math.max(0, lo - (placed[0] ?? lo));
  const moved = placed.map((p, i) => {
    const e = sorted[i] as End;
    return e.toward < lo || e.toward > hi ? p + shift : p;
  });
  if (shift < 0)
    for (let i = moved.length - 2; i >= 0; i--)
      moved[i] = Math.min(moved[i] as number, (moved[i + 1] as number) - (apart[i] ?? 0));
  if (shift > 0)
    for (let i = 1; i < moved.length; i++)
      moved[i] = Math.max(moved[i] as number, (moved[i - 1] as number) + (apart[i - 1] ?? 0));
  return moved;
}
