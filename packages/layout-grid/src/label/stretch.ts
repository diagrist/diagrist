import type { Route } from '../layout.js';
import { LINE_GAP, piecesOf, span } from './gutter-text.js';
import type { OnLine } from './on-line.js';
import type { EdgeLabel } from './types.js';

/**
 * Whether the block of route `i`'s texts on its line (`block`, as `onLineTexts` set it) has a stretch of a piece of
 * its line to stand on clear of the parallel pieces of other routes. A parallel piece within half the block's depth
 * and `LINE_GAP` of the piece takes the stretch it runs beside, and `LINE_GAP` beyond its ends; what is left must
 * hold the block with its pad, `LINE_GAP` from either end of the piece as from a box there. A text without such a
 * stretch may stand beside its line (owner decision E1 of 07.11.2026): on it, it would meet a foreign line however
 * it slid.
 */
export function hasStretch(i: number, routes: readonly Route[], block: readonly EdgeLabel[], onLine: OnLine): boolean {
  const route = routes[i];
  if (!route || block.length === 0) return true;
  const boxes = block.map((l) => l.box);
  const left = Math.min(...boxes.map((b) => b.x));
  const top = Math.min(...boxes.map((b) => b.y));
  const w = Math.max(...boxes.map((b) => b.x + b.w)) - left + 2 * onLine.pad.x;
  const h = Math.max(...boxes.map((b) => b.y + b.h)) - top + 2 * onLine.pad.y;
  const foreign = routes.flatMap((r, k) => (k === i ? [] : piecesOf(r.points)));
  return piecesOf(route.points).some((p) => {
    const across = (q: typeof p) => (p.upright ? q.a[0] : q.a[1]);
    const [deep, long] = p.upright ? [w, h] : [h, w];
    const taken = foreign
      .filter((q) => q.upright === p.upright && Math.abs(across(q) - across(p)) < deep / 2 + LINE_GAP)
      .map((q) => span(q, p.upright))
      .sort((a, b) => a[0] - b[0]);
    const [lo, hi] = span(p, p.upright);
    const end = hi - LINE_GAP;
    let from = lo + LINE_GAP;
    for (const [a, b] of taken) {
      if (Math.min(a - LINE_GAP, end) - from >= long) return true;
      from = Math.max(from, b + LINE_GAP);
    }
    return end - from >= long;
  });
}
