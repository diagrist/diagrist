import type { Point, Rect } from '@diagrist/core';
import { overlaps, segmentHitsRect } from '../geometry.js';
import type { Route } from '../layout.js';
import { framesAround } from '../placed.js';
import { type Board, headOf } from '../route/boxes.js';

/** Room a text or mark keeps from boxes and heads, and from what was placed before it. */
const PAD = 4;
const TAKEN = 2;

/** What a spot for the texts or marks of a route must keep clear of, and what was placed so far. */
export interface Clear {
  /**
   * The number of things a rectangle on route `route` meets: boxes, their captions, heads, frames that hold neither end
   * of its edge, what was taken, lines that share no end with its own nearer than `lineGap`, and its own line unless
   * `onLine`. A frame that holds an end is met where the rectangle comes nearer to its outline than `lineGap`, inside
   * or out, as a foreign line would be; a text on its line keeps only the pad of boxes, since its rectangle brings
   * its own. A free spot meets nothing. Counting stops at `limit`.
   */
  readonly cost: (rect: Rect, route: number, lineGap: number, onLine: boolean, limit?: number) => number;
  /** Marks a placed rectangle as taken, and frees it again. */
  readonly take: (rect: Rect) => void;
  readonly drop: (rect: Rect) => void;
}

/** Whether `r` lies inside `outer` and keeps `gap` from its outline on every side. */
const holds = (outer: Rect, r: Rect, gap: number): boolean =>
  r.x >= outer.x + gap &&
  r.y >= outer.y + gap &&
  r.x + r.w <= outer.x + outer.w - gap &&
  r.y + r.h <= outer.y + outer.h - gap;

const segmentsOf = (points: readonly Point[]): (readonly [Point, Point])[] =>
  points.slice(1).map((p, i) => [points[i] as Point, p] as const);

const key = (p: Point | undefined): string => (p ? `${p[0].toFixed(1)},${p[1].toFixed(1)}` : '');

/** Whether two routes meet at one of their ends, as a bundle does. */
function bundled(a: Route, b: Route): boolean {
  const ends = (r: Route) => [key(r.points[0]), key(r.points.at(-1))];
  return ends(a).some((e) => ends(b).includes(e));
}

/** The clearance of a channel grid for the texts and marks on its routes, with `taken` placed already. */
export function clearOf(board: Board, routes: readonly Route[], taken: readonly Rect[]): Clear {
  const placed = [...taken];
  const heads = board.layout.groups.flatMap((g) => (board.tree.group(g.id)?.head ? [headOf(board, g)] : []));
  const captions = board.layout.nodes.flatMap((node): Rect[] => {
    const c = board.node(node.id)?.caption;
    const r = node.rect;
    return c ? [{ x: r.x + r.w / 2 - c.w / 2, y: r.y + r.h, w: c.w, h: c.below }] : [];
  });
  const edges = new Map(board.tree.spec.edges.map((e) => [e.id, e]));
  const allowed = routes.map((r) => {
    const e = edges.get(r.edge);
    return new Set(e ? [...framesAround(board.tree, e.from), ...framesAround(board.tree, e.to)] : []);
  });
  const segments = routes.map((r) => segmentsOf(r.points));
  const solid = [...board.layout.nodes.map((node) => node.rect), ...heads, ...captions];
  const foreign = routes.map((own) => routes.map((r) => r !== own && !bundled(own, r)));
  const cost = (rect: Rect, route: number, lineGap: number, onLine: boolean, limit = Infinity): number => {
    let n = rect.x < 0 || rect.y < 0 || rect.x + rect.w > board.layout.width ? 1 : 0;
    for (const r of solid) if (n < limit && overlaps(rect, r, PAD)) n++;
    for (const g of board.layout.groups) {
      const own = allowed[route]?.has(g.id) === true;
      const keep = own && !onLine ? lineGap : PAD;
      if (n < limit && overlaps(rect, g.rect, keep) && !(own && holds(g.rect, rect, keep))) n++;
    }
    for (const t of placed) if (n < limit && overlaps(rect, t, TAKEN)) n++;
    for (const [i, list] of segments.entries()) {
      const near = i === route ? !onLine : foreign[route]?.[i] === true;
      const gap = i === route ? 1 : lineGap;
      if (near) for (const [p, q] of list) if (n < limit && segmentHitsRect(p, q, rect, gap)) n++;
    }
    return n;
  };
  const drop = (rect: Rect) => {
    const i = placed.indexOf(rect);
    if (i >= 0) placed.splice(i, 1);
  };
  return { cost, take: (rect) => placed.push(rect), drop };
}
