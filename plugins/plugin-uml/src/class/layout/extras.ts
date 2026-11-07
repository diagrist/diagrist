import type { Point, Rect } from '@diagrist/core';
import type { GridLayout, Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';

/** The dashed line of an association class, between the class and its association. */
export interface Tether {
  readonly points: readonly Point[];
  /** The association class. */
  readonly from: string;
  /** The association: the index of the route of a binary one, the id of the diamond of an n-ary one. */
  readonly on: number | string;
  /** The source line that names the class, so the line check points at it. */
  readonly span?: ClassRelation['span'];
}

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
 * Association classes: the dashed lines the pipeline drew from the line of a binary association (`Routed.tethers`),
 * and straight from the nearest point on the border of the class to the vertex of the diamond of an n-ary one.
 */
export function tethers(binary: readonly Tether[], m: ClassModel, grid: GridLayout): Tether[] {
  const nary = m.diagram.associations.flatMap((x): Tether[] => {
    const [d, box] = [rectOf(grid, x.id), rectOf(grid, x.via)];
    if (!d || !box || x.via === undefined) return [];
    const a = vertexToward(d, box);
    return [{ points: [clamp(a, box), a], from: x.via, on: x.id, span: x.span }];
  });
  return [...binary, ...nary];
}
