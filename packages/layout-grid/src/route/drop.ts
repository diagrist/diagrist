import type { Point, Rect } from '@diagrist/core';
import { bottom, right, type Side, segmentHitsRect, segmentsCross } from '../geometry.js';
import type { Board } from './boxes.js';
import type { Routed } from './routed.js';

/** An edge that may drop: its narrow end, the wide end above or below it, and the gaps beside the narrow end. */
interface Drop {
  readonly index: number;
  readonly route: Routed;
  readonly narrow: Rect;
  readonly wide: Rect;
  readonly narrowIsStart: boolean;
  readonly gap: { readonly lo: number; readonly hi: number; readonly side: Side };
}

const below = (a: Rect, b: Rect): boolean => b.y >= bottom(a);
const above = (a: Rect, b: Rect): boolean => bottom(b) <= a.y;
const piecesOf = (points: readonly Point[]): (readonly [Point, Point])[] =>
  points.slice(1).map((q, i) => [points[i] as Point, q] as const);

/** Whether a piece crosses a laid route or runs beside one of its pieces closer than `gap`. */
function meets([p, q]: readonly [Point, Point], used: readonly (readonly Point[])[], gap: number): boolean {
  const vertical = p[0] === q[0];
  const span = (r: Point, s: Point) => (vertical ? [r[1], s[1]] : [r[0], s[0]]).sort((x, y) => x - y);
  const [lo = 0, hi = 0] = span(p, q);
  return used.some((route) =>
    piecesOf(route).some(([r, s]) => {
      if (segmentsCross(p, q, r, s)) return true;
      if ((r[0] === s[0]) !== vertical) return false;
      const [a = 0, b = 0] = span(r, s);
      const across = vertical ? Math.abs(r[0] - p[0]) : Math.abs(r[1] - p[1]);
      return across < gap && Math.min(hi, b) - Math.max(lo, a) > 1;
    }),
  );
}

/** The first gap beside the narrow end, right then left, that the wide end reaches under. */
function dropOf(index: number, r: Routed, board: Board, gap: number): Drop | undefined {
  const [a, b] = [r.from.rect, r.to.rect];
  const wideEnd = (n: Rect, w: Rect) => (below(n, w) || above(n, w)) && w.w > n.w;
  const narrowIsStart = wideEnd(a, b);
  if (!narrowIsStart && !wideEnd(b, a)) return undefined;
  const [narrow, wide] = narrowIsStart ? [a, b] : [b, a];
  const cols = board.layout.cols;
  const gaps = cols.slice(1).map((c, k) => ({ lo: (cols[k]?.x ?? 0) + (cols[k]?.w ?? 0), hi: c.x }));
  const rightGap = gaps.filter((g) => g.lo >= right(narrow)).sort((g, h) => g.lo - h.lo)[0];
  const leftGap = gaps.filter((g) => g.hi <= narrow.x).sort((g, h) => h.hi - g.hi)[0];
  const fits = (g: { lo: number; hi: number } | undefined) =>
    g !== undefined && g.lo >= wide.x + gap && g.hi <= right(wide) - gap;
  if (fits(rightGap))
    return { index, route: r, narrow, wide, narrowIsStart, gap: { ...(rightGap as Drop['gap']), side: 'right' } };
  if (fits(leftGap))
    return { index, route: r, narrow, wide, narrowIsStart, gap: { ...(leftGap as Drop['gap']), side: 'left' } };
  return undefined;
}

/**
 * Edges between a box and a wide box above or below it that reaches under the gap beside the first run as an L: out
 * of the side of the narrow box facing that gap, along to the gap, and straight up or down into the wide box,
 * instead of a path to the middle of a column. The gap right of the narrow box is taken first, else the one left
 * of it. The Ls of one gap share it evenly, ordered by where their narrow boxes stand, so their runs along do not
 * cross and texts on them find room; an L that meets a node, a head strip or a laid route is left to the path
 * search. Returns the Ls by the index of their route, laid into `used`.
 */
export function dropRoutes(
  routes: readonly (Routed | undefined)[],
  board: Board,
  blocks: (r: Routed) => readonly Rect[],
  used: Point[][],
  gap: number,
): Map<number, Routed> {
  const drops = routes.flatMap((r, i) => (r ? [dropOf(i, r, board, gap)] : [])).filter((d) => d !== undefined);
  const byGap = new Map<number, Drop[]>();
  for (const d of drops) byGap.set(d.gap.lo, [...(byGap.get(d.gap.lo) ?? []), d]);
  const out = new Map<number, Routed>();
  for (const list of byGap.values()) {
    const sorted = [...list].sort((p, q) => p.narrow.x - q.narrow.x || p.index - q.index);
    sorted.forEach((d, k) => {
      const x = Math.round(d.gap.lo + ((d.gap.hi - d.gap.lo) * (k + 1)) / (sorted.length + 1));
      const exit = d.gap.side === 'right' ? right(d.narrow) : d.narrow.x;
      const y = d.narrow.y + d.narrow.h / 2;
      const downward = below(d.narrow, d.wide);
      const points: Point[] = [
        [exit, y],
        [x, y],
        [x, downward ? d.wide.y : bottom(d.wide)],
      ];
      const own = new Set([d.route.from.id, d.route.to.id]);
      const solid = [...board.nodes.filter((n) => !own.has(n.id)).map((n) => n.rect), ...blocks(d.route)];
      const pieces = piecesOf(points);
      if (Math.abs(x - exit) < gap) return;
      if (pieces.some(([p, q]) => solid.some((rect) => segmentHitsRect(p, q, rect, gap / 2)))) return;
      if (pieces.some((piece) => meets(piece, used, gap))) return;
      const vertical: Side = downward ? 'top' : 'bottom';
      const [fromSide, toSide]: [Side, Side] = d.narrowIsStart ? [d.gap.side, vertical] : [vertical, d.gap.side];
      const laid = d.narrowIsStart ? points : [...points].reverse();
      used.push(laid);
      out.set(d.index, { ...d.route, points: laid, fromSide, toSide, shape: 'orthogonal' });
    });
  }
  return out;
}
