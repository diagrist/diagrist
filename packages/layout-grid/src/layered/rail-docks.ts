import type { Rect } from '@diagrist/core';
import type { RailSide } from './rail-order.js';
import type { LayeredMetrics } from './spec.js';

/** A rail's ends as the docks place them: the two boxes, by layer, its side and its track. */
export interface RailEnds {
  readonly edge: { readonly id: string };
  readonly upper: string;
  readonly lower: string;
  readonly side: RailSide;
  readonly at: number;
}

const right = (r: Rect) => r.x + r.w;

/**
 * The ends of the rails on each side of a box, top first: those leaving it upward, inner rails first, then those
 * arriving from below, outer rails first, so no piece out of the box crosses a rail of another; `portGap` apart, or
 * closer where the side is short, around its middle; on a box whose ends stand at the middle of their sides
 * (`LayeredNode.sides`), all at its middle.
 */
export function railDocks(
  laid: readonly RailEnds[],
  rects: ReadonlyMap<string, Rect>,
  m: LayeredMetrics,
  fixed: ReadonlySet<string>,
): Map<string, number> {
  const ends = new Map<string, { key: string; up: boolean; reach: number }[]>();
  for (const l of laid)
    for (const [n, up] of [
      [l.lower, true],
      [l.upper, false],
    ] as const) {
      const r = rects.get(n);
      if (r === undefined) continue;
      const reach = Math.abs(l.at - (l.side === 'left' ? r.x : right(r)));
      const at = `${n}|${l.side}`;
      ends.set(at, [...(ends.get(at) ?? []), { key: `${l.edge.id}|${up ? 'lower' : 'upper'}`, up, reach }]);
    }
  const out = new Map<string, number>();
  for (const [at, list] of ends) {
    const r = rects.get(at.split('|')[0] ?? '') as Rect;
    const ordered = [
      ...list.filter((x) => x.up).sort((a, b) => a.reach - b.reach),
      ...list.filter((x) => !x.up).sort((a, b) => b.reach - a.reach),
    ];
    const step =
      ordered.length > 1 && !fixed.has(at.split('|')[0] ?? '')
        ? Math.min(m.portGap, (r.h - 8) / (ordered.length - 1))
        : 0;
    ordered.forEach((x, i) => {
      out.set(x.key, r.y + r.h / 2 + (i - (ordered.length - 1) / 2) * step);
    });
  }
  return out;
}
