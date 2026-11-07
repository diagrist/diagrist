import type { Point, Rect } from '@diagrist/core';
import { union } from '../geometry.js';
import type { Route } from '../layout.js';
import type { GridMetrics } from '../spec.js';
import type { OnLine } from './on-line.js';
import type { EdgeLabel } from './types.js';

/** Room two placed texts keep from each other, as the spot search asks (`clearOf`), and a pixel against rounding. */
const TAKEN = 2 + 1;

/** The block of one route's texts on its line: the rectangle its padded texts take and the piece it stands on. */
interface Block {
  readonly route: number;
  readonly rect: Rect;
  readonly a: Point;
  readonly b: Point;
  readonly horizontal: boolean;
}

const padded = (r: Rect, pad: OnLine['pad']): Rect => ({
  x: r.x - pad.x,
  y: r.y - pad.y,
  w: r.w + 2 * pad.x,
  h: r.h + 2 * pad.y,
});

/** The piece of `points` the middle of `rect` stands on, if any. */
function pieceUnder(points: readonly Point[], rect: Rect): readonly [Point, Point] | undefined {
  const [mx, my] = [rect.x + rect.w / 2, rect.y + rect.h / 2];
  const on = (a: Point, b: Point) =>
    a[1] === b[1]
      ? Math.abs(my - a[1]) <= rect.h / 2 && mx >= Math.min(a[0], b[0]) && mx <= Math.max(a[0], b[0])
      : Math.abs(mx - a[0]) <= rect.w / 2 && my >= Math.min(a[1], b[1]) && my <= Math.max(a[1], b[1]);
  for (let i = 1; i < points.length; i++) {
    const [a, b] = [points[i - 1] as Point, points[i] as Point];
    if (on(a, b)) return [a, b];
  }
  return undefined;
}

/** Along and across a block's piece: where its rectangle starts and ends, and where the piece runs. */
const along = (k: Block) => (k.horizontal ? [k.rect.x, k.rect.x + k.rect.w] : [k.rect.y, k.rect.y + k.rect.h]);
const ends = (k: Block) => {
  const i = k.horizontal ? 0 : 1;
  return [Math.min(k.a[i], k.b[i]), Math.max(k.a[i], k.b[i])];
};
const across = (k: Block) => (k.horizontal ? k.a[1] : k.a[0]);
const depth = (k: Block) => (k.horizontal ? k.rect.h : k.rect.w);

/**
 * How far apart the lines of two routes ask to run where the texts on them could not keep the lead from the ends of
 * their pieces (ADR 0039, 9, owner decision D1 of 07.11.2026): a block of texts on its line that comes nearer an end
 * of its piece than `lead`, beside a parallel piece of another route whose block shares a stretch of it, needs the two
 * lines so far apart that the blocks stand one beside the other across them. Both edges ask that distance, rounded
 * up to the grid; a pair already that far apart asks nothing. Without texts on the line, or without `lead`, nothing.
 */
export function apartOf(
  routes: readonly Route[],
  labels: readonly EdgeLabel[],
  m: GridMetrics,
  onLine: OnLine | undefined,
): Map<string, number> {
  const out = new Map<string, number>();
  if (!onLine || m.lead === undefined) return out;
  const lead = m.lead;
  const blocks = routes.flatMap((r, route): Block[] => {
    const own = labels.filter((l) => l.route === route).map((l) => padded(l.box, onLine.pad));
    const rect = own.length > 0 ? union(own) : undefined;
    const piece = rect && pieceUnder(r.points, rect);
    return rect && piece ? [{ route, rect, a: piece[0], b: piece[1], horizontal: piece[0][1] === piece[1][1] }] : [];
  });
  const squeezed = (k: Block) => {
    const [lo, hi] = along(k);
    const [a, b] = ends(k);
    return (lo ?? 0) - (a ?? 0) < lead - 0.5 || (b ?? 0) - (hi ?? 0) < lead - 0.5;
  };
  const meet = (k: Block, q: Block) => {
    const [a, b] = ends(k);
    const [c, d] = ends(q);
    return k.horizontal === q.horizontal && (a ?? 0) < (d ?? 0) && (c ?? 0) < (b ?? 0);
  };
  const ask = (k: Block, gap: number) => {
    const edge = routes[k.route]?.edge ?? '';
    out.set(edge, Math.max(out.get(edge) ?? 0, gap));
  };
  for (const k of blocks.filter(squeezed)) {
    const near = blocks
      .filter((q) => q !== k && meet(k, q))
      .map((q) => ({ q, d: Math.abs(across(q) - across(k)), need: (depth(k) + depth(q)) / 2 + TAKEN }))
      .filter(({ d, need }) => d < need)
      .sort((x, y) => x.d - y.d)[0];
    if (!near) continue;
    const gap = Math.ceil(near.need / m.grid) * m.grid;
    ask(k, gap);
    ask(near.q, gap);
  }
  return out;
}
