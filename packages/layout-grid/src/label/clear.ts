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
   * The number of things a rectangle on route `route` meets: boxes, their captions, heads, frames that hold neither end of its edge
   * or that it only reaches into, what was taken, lines that share no end with its own nearer than `lineGap`, and
   * its own line unless `onLine`. A free spot meets nothing.
   */
  readonly cost: (rect: Rect, route: number, lineGap: number, onLine: boolean) => number;
  /** Marks a placed rectangle as taken, and frees it again. */
  readonly take: (rect: Rect) => void;
  readonly drop: (rect: Rect) => void;
}

const holds = (outer: Rect, r: Rect): boolean =>
  r.x >= outer.x + 1 && r.y >= outer.y + 1 && r.x + r.w <= outer.x + outer.w - 1 && r.y + r.h <= outer.y + outer.h - 1;

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
  const cost = (rect: Rect, route: number, lineGap: number, onLine: boolean): number => {
    const own = routes[route];
    let n = rect.x < 0 || rect.y < 0 || rect.x + rect.w > board.layout.width ? 1 : 0;
    n += board.layout.nodes.filter((node) => overlaps(rect, node.rect, PAD)).length;
    n += [...heads, ...captions].filter((h) => overlaps(rect, h, PAD)).length;
    n += board.layout.groups.filter(
      (g) => overlaps(rect, g.rect, PAD) && !(holds(g.rect, rect) && allowed[route]?.has(g.id)),
    ).length;
    n += placed.filter((t) => overlaps(rect, t, TAKEN)).length;
    routes.forEach((r, i) => {
      const near = i === route ? !onLine : own !== undefined && !bundled(own, r);
      const gap = i === route ? 1 : lineGap;
      if (near) n += (segments[i] ?? []).filter(([p, q]) => segmentHitsRect(p, q, rect, gap)).length;
    });
    return n;
  };
  const drop = (rect: Rect) => {
    const i = placed.indexOf(rect);
    if (i >= 0) placed.splice(i, 1);
  };
  return { cost, take: (rect) => placed.push(rect), drop };
}
