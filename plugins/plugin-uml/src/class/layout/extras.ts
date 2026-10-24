import type { Point, Rect } from '@diagrist/core';
import { type GridLayout, pointAlong, polylineLength, type Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { CLASS, tabWidth } from './metrics.js';

/** A straight dashed piece, such as the line of an association class. */
export interface Tether {
  readonly a: Point;
  readonly b: Point;
}

/** Distance of the docking point from the ends of the line piece. */
const INSET = 24;

const rectOf = (grid: GridLayout, id: string | undefined): Rect | undefined =>
  id === undefined ? undefined : grid.nodes.find((n) => n.id === id)?.rect;

/**
 * A leg starts at a vertex of the diamond: the router spreads several lines on one side, the diamond takes them at
 * its vertex. The first piece moves along, so the line stays orthogonal and legs on one side share it.
 */
function toVertex(points: readonly Point[], d: Rect): Point[] {
  const out = points.map((p): [number, number] => [p[0], p[1]]);
  const [p, q] = [out[0], out[1]];
  if (!p || !q) return out;
  const vertical = p[1] === d.y || p[1] === d.y + d.h;
  const axis = vertical ? 0 : 1;
  const target = vertical ? d.x + d.w / 2 : d.y + d.h / 2;
  if (q[axis] === p[axis]) q[axis] = target;
  p[axis] = target;
  return out;
}

/** The legs of all n-ary associations at the vertices of their diamond. */
export function legsAtVertices(
  routes: readonly Route[],
  relations: readonly (ClassRelation | undefined)[],
  m: ClassModel,
  grid: GridLayout,
): Route[] {
  const diamond = (id: string | undefined) =>
    id !== undefined && m.associations.has(id) ? rectOf(grid, id) : undefined;
  return routes.map((r, i) => {
    const rel = relations[i];
    if (!rel || r.points.length < 2) return r;
    const [a, b] = [diamond(rel.from), diamond(rel.to)];
    if (!a === !b) return r;
    const points = a ? toVertex(r.points, a) : toVertex([...r.points].reverse(), b as Rect).reverse();
    return { ...r, points };
  });
}

/** A line ending on the top edge of a package beside its tab reaches down to the body below the tab. */
export function belowTabs(
  routes: readonly Route[],
  relations: readonly (ClassRelation | undefined)[],
  m: ClassModel,
  grid: GridLayout,
): Route[] {
  const lowered = (end: Point, id: string | undefined): Point => {
    const frame = id === undefined ? undefined : grid.groups.find((g) => g.id === id);
    const label = id === undefined ? undefined : m.packages.get(id)?.label;
    if (!frame || label === undefined) return end;
    const tab = Math.min(frame.rect.w, tabWidth(label));
    const onTop = end[1] === frame.rect.y && end[0] > frame.rect.x + tab && end[0] <= frame.rect.x + frame.rect.w;
    return onTop ? [end[0], end[1] + CLASS.tabH] : end;
  };
  return routes.map((r, i) => {
    const rel = relations[i];
    const first = r.points[0];
    const last = r.points.at(-1);
    if (!rel || !first || !last) return r;
    const points = [lowered(first, rel.from), ...r.points.slice(1, -1), lowered(last, rel.to)];
    return { ...r, points };
  });
}

/**
 * Where the dashed line of an association class meets its association: the middle of the line; when the middle of
 * the class lies across from the same straight piece, right opposite it, so the dashed line stays straight.
 */
function dock(points: readonly Point[], box: Rect): Point {
  const { p } = pointAlong(points, polylineLength(points) / 2);
  const centre: Point = [box.x + box.w / 2, box.y + box.h / 2];
  for (let i = 0; i + 1 < points.length; i++) {
    const [a, b] = [points[i] as Point, points[i + 1] as Point];
    if (a[1] !== b[1] && a[0] !== b[0]) continue;
    const axis = a[1] === b[1] ? 0 : 1;
    const across = axis === 0 ? 1 : 0;
    if (p[across] !== a[across]) continue;
    const [lo, hi] = [Math.min(a[axis], b[axis]) + INSET, Math.max(a[axis], b[axis]) - INSET];
    const v = p[axis];
    if (v < lo - 1e-6 || v > hi + 1e-6) continue;
    const at = Math.min(Math.max(centre[axis], lo), hi);
    return axis === 0 ? [at, a[1]] : [a[0], at];
  }
  return p;
}

const clamp = (p: Point, box: Rect): Point => [
  Math.min(Math.max(p[0], box.x), box.x + box.w),
  Math.min(Math.max(p[1], box.y), box.y + box.h),
];

/** The vertex of the diamond towards the class: top, bottom, left or right. */
function vertexToward(d: Rect, box: Rect): Point {
  const [cx, cy] = [d.x + d.w / 2, d.y + d.h / 2];
  if (box.y + box.h <= d.y) return [cx, d.y];
  if (box.y >= d.y + d.h) return [cx, d.y + d.h];
  return box.x + box.w <= d.x ? [d.x, cy] : [d.x + d.w, cy];
}

/**
 * Association classes: a dashed line from the association line, or from the vertex of the
 * diamond, to the nearest point on the border of the class.
 */
export function tethers(
  routes: readonly Route[],
  relations: readonly (ClassRelation | undefined)[],
  m: ClassModel,
  grid: GridLayout,
): Tether[] {
  const binary = routes.flatMap((r, i): Tether[] => {
    const box = rectOf(grid, relations[i]?.via);
    if (!box || r.points.length < 2) return [];
    const a = dock(r.points, box);
    return [{ a, b: clamp(a, box) }];
  });
  const nary = m.diagram.associations.flatMap((x): Tether[] => {
    const [d, box] = [rectOf(grid, x.id), rectOf(grid, x.via)];
    if (!d || !box) return [];
    const a = vertexToward(d, box);
    return [{ a, b: clamp(a, box) }];
  });
  return [...binary, ...nary];
}
