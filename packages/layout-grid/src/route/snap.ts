import type { Point, Rect } from '@diagrist/core';
import type { Board } from './boxes.js';
import type { Routed } from './routed.js';

/** Centre and half axes of an ellipse filling its rectangle. */
export interface Ellipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

export function ellipseIn(rect: Rect): Ellipse {
  const rx = rect.w / 2;
  const ry = rect.h / 2;
  return { cx: rect.x + rx, cy: rect.y + ry, rx, ry };
}

/** The ellipse of an ellipse node, else undefined. */
export function ellipseOf(board: Board, id: string | undefined): Ellipse | undefined {
  const p = id === undefined ? undefined : board.placed(id);
  return p && board.node(p.id)?.shape === 'ellipse' ? ellipseIn(p.rect) : undefined;
}

function circleOf(board: Board, id: string): { cx: number; cy: number; r: number } | undefined {
  const p = board.placed(id);
  if (!p || board.node(id)?.shape !== 'circle') return undefined;
  return { cx: p.rect.x + p.rect.w / 2, cy: p.rect.y + p.rect.h / 2, r: p.rect.w / 2 };
}

/** Vertical straight edges with a lane reach into the frames at their ends, like an arrow through layers. */
export function insetLaneEnds(routes: readonly Routed[], inset: number): Routed[] {
  return routes.map((r) => {
    if (!r.edge.lane || r.points.length !== 2) return r;
    const [a, b] = r.points as readonly [Point, Point];
    if (a[0] !== b[0]) return r;
    const dir = Math.sign(b[1] - a[1]);
    const start: Point = r.from.id.startsWith('group:') ? [a[0], a[1] - dir * inset] : a;
    const end: Point = r.to.id.startsWith('group:') ? [b[0], b[1] + dir * inset] : b;
    return { ...r, points: [start, end] };
  });
}

function onCircle(end: Point, next: Point, c: { cx: number; cy: number; r: number }): Point {
  if (end[1] === next[1]) {
    const dy = end[1] - c.cy;
    if (Math.abs(dy) >= c.r) return end;
    const dx = Math.sqrt(c.r * c.r - dy * dy);
    return [next[0] < c.cx ? c.cx - dx : c.cx + dx, end[1]];
  }
  const dx = end[0] - c.cx;
  if (Math.abs(dx) >= c.r) return end;
  const dy = Math.sqrt(c.r * c.r - dx * dx);
  return [end[0], next[1] < c.cy ? c.cy - dy : c.cy + dy];
}

/** The point on the ellipse on the same horizontal or vertical line as `end`, from the side of `next`. */
function onEllipse(end: Point, next: Point, e: Ellipse): Point {
  if (end[1] === next[1]) {
    const dy = (end[1] - e.cy) / e.ry;
    if (Math.abs(dy) >= 1) return end;
    const dx = e.rx * Math.sqrt(1 - dy * dy);
    return [Math.round((next[0] < e.cx ? e.cx - dx : e.cx + dx) * 10) / 10, end[1]];
  }
  const dx = (end[0] - e.cx) / e.rx;
  if (Math.abs(dx) >= 1) return end;
  const dy = e.ry * Math.sqrt(1 - dx * dx);
  return [end[0], Math.round((next[1] < e.cy ? e.cy - dy : e.cy + dy) * 10) / 10];
}

/** Ends at circles and ellipses move from the surrounding square onto the outline, along the last segment. */
export function snapToOutlines(routes: readonly Routed[], board: Board): Routed[] {
  const snap = <S>(
    rs: readonly Routed[],
    shape: (id: string) => S | undefined,
    onto: (e: Point, n: Point, s: S) => Point,
  ) =>
    rs.map((r) => {
      if (r.points.length < 2) return r;
      const from = shape(r.from.id);
      const to = shape(r.to.id);
      if (!from && !to) return r;
      const points = [...r.points];
      if (from) points[0] = onto(points[0] as Point, points[1] as Point, from);
      if (to) points[points.length - 1] = onto(points.at(-1) as Point, points.at(-2) as Point, to);
      return { ...r, points };
    });
  const circled = snap(routes, (id) => circleOf(board, id), onCircle);
  return snap(circled, (id) => ellipseOf(board, id), onEllipse);
}
