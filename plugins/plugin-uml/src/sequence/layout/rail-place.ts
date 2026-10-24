import type { Rect } from '@diagrist/core';
import { hits, type Obstacle, type RailPieces } from './rail-spot.js';
import type { SeqCtx } from './text.js';

/**
 * Where a time constraint stands beside a lifeline. On the left (`side` -1) the bracket opens to the right and
 * the text stands left of it; on the right (`side` 1) it is mirrored.
 */
export type Side = -1 | 1;

/** A message at height `y` from `x1` to `x2`; `dock` and `dockR` are the edges of the lifeline. */
export interface End {
  readonly index: number;
  readonly y: number;
  readonly x1: number;
  readonly x2: number;
  /** Left edge at the left common lifeline. */
  readonly dock: number;
  /** Right edge at the right common lifeline. */
  readonly dockR: number;
}

/** A time constraint with the heights of its messages. */
export interface Placed {
  readonly text: string;
  readonly w: number;
  readonly top: number;
  readonly bottom: number;
  readonly ends: readonly End[];
  /** Left edge of the bars at the left common lifeline; missing without a common lifeline. */
  readonly anchor: number | undefined;
  /** Right edge of the bars at the right common lifeline. */
  readonly anchorR: number | undefined;
  /** The left common lifeline is the first: the rail on the left crosses no other. */
  readonly leftmost: boolean;
}

/** Bracket with its open side at `x`, text outside beside it, guide lines to the lifeline of the constraint. */
export function pieces(p: Placed, x: number, side: Side, c: SeqCtx): RailPieces & { readonly back: Rect } {
  const s = c.s;
  const tick = x + side * s.railTick;
  const mid = (p.top + p.bottom) / 2;
  const tx = tick + side * s.railTextGap;
  const left = side < 0 ? tx - p.w - s.knockout : tx - s.knockout;
  const back: Rect = { x: left, y: mid - s.lineH / 2, w: p.w + 2 * s.knockout, h: s.lineH };
  const bx = Math.min(x, tick);
  const bracket: Rect =
    p.top === p.bottom
      ? { x: bx, y: p.top - s.railTick / 2, w: s.railTick, h: s.railTick }
      : { x: bx, y: p.top, w: s.railTick, h: p.bottom - p.top };
  const guides = p.ends.flatMap((e) => {
    if (x >= e.x1 && x <= e.x2) return [];
    if (side < 0) {
      const end = Math.min(e.x1, e.dock);
      return end > x ? [{ x, y: e.y - 0.5, w: end - x, h: 1 }] : [];
    }
    const start = Math.max(e.x2, e.dockR);
    return start < x ? [{ x: start, y: e.y - 0.5, w: x - start, h: 1 }] : [];
  });
  return { solid: [bracket, back], guides, back };
}

/**
 * When a tick lies on the line of its message it disappears in it (two gate messages that both pass the
 * bracket). Then both ends of the vertical stroke get open arrowheads pointing at the messages, like a
 * dimension line.
 */
export function hiddenTicks(p: Placed, x: number, tick: number, c: SeqCtx): string {
  const a = c.s.railTick / 2;
  const [lo, hi] = [Math.min(x, tick), Math.max(x, tick)];
  if (!p.ends.some((e) => lo >= e.x1 && hi <= e.x2)) return '';
  return p.ends
    .map((e) => {
      const d = e.y === p.top ? 2 * a : -2 * a;
      return ` M${tick - a} ${e.y + d} L${tick} ${e.y} L${tick + a} ${e.y + d}`;
    })
    .join('');
}

/**
 * The next free position beside the lifeline of the constraint, outwards on side `side` up to `limit`;
 * missing when there is no room.
 */
export function local(
  p: Placed,
  side: Side,
  limit: number,
  obstacles: readonly Obstacle[],
  c: SeqCtx,
): number | undefined {
  const from = side < 0 ? p.anchor : p.anchorR;
  if (from === undefined) return undefined;
  const own = p.ends.map((e) => e.index);
  let x = from + side * c.s.railTick;
  while (side < 0 ? x > limit : x < limit) {
    const hit = hits(pieces(p, x, side, c), obstacles, own);
    if (hit.length === 0) return x;
    const next =
      side < 0
        ? Math.min(...hit.map((r) => r.x)) - c.s.railTextGap
        : Math.max(...hit.map((r) => r.x + r.w)) + c.s.railTextGap;
    if (side < 0 ? next >= x - 0.5 : next <= x + 0.5) return undefined;
    x = next;
  }
  return undefined;
}
