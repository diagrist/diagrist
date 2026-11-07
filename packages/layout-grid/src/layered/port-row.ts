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
}

/** How near a corner an end may come: when that spares its line a small jog, or when the corner is square. */
export const CORNER = 4;

/**
 * Where the ends of one side of `r` stand, in their order: each as near its `toward` as the side between `inset`
 * from its corners and a gap of `gap` between ends allow (`isotoneApart`), the whole row then shifted back between
 * the insets. An end the shift pushes past an inset stays off its corner by the radius of the box's corners
 * (`corner`), at least `CORNER` and at most `inset`: on a rounded corner it would stand on the rounding, while on a
 * square one an end 8 px from the corner reads as clearly as one 16 px away. A box of unknown corners keeps `inset`.
 */
export function rowOf(
  sorted: readonly End[],
  r: Rect,
  inset: number,
  gap: number,
  corner: number = inset,
): { readonly at: number[]; readonly step: number } {
  const [lo, hi] = [r.x + inset, r.x + r.w - inset];
  const step = sorted.length < 2 ? 0 : Math.min(gap, (hi - lo) / (sorted.length - 1));
  const wanted = sorted.map((e) => Math.min(hi, Math.max(lo, e.toward)));
  const placed = isotoneApart(
    wanted,
    sorted.map((e) => e.hold),
    sorted.slice(1).map(() => step),
  );
  const shift = Math.min(0, hi - (placed.at(-1) ?? hi)) + Math.max(0, lo - (placed[0] ?? lo));
  const edge = Math.min(inset, Math.max(CORNER, corner));
  const [first, last] = [r.x + edge, r.x + r.w - edge];
  const n = sorted.length;
  const at = placed.map((p, i) =>
    Math.round(Math.min(last - (n - 1 - i) * step, Math.max(first + i * step, p + shift))),
  );
  return { at, step };
}
