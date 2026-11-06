import type { Point, Rect } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { Route } from '../layout.js';
import type { GraphNode } from './spec.js';

/** A straight line ends this far outside a box; on an ellipse it ends on the outline. */
const GAP = 3;

/** Where a ray from `o` inside the rectangle leaves it. */
function exitBox(o: Point, d: Point, r: Rect): Point {
  const along = (from: number, dir: number, lo: number, hi: number) =>
    dir > 0 ? (hi - from) / dir : dir < 0 ? (lo - from) / dir : Number.POSITIVE_INFINITY;
  const t = Math.max(0, Math.min(along(o[0], d[0], r.x, r.x + r.w), along(o[1], d[1], r.y, r.y + r.h)));
  return [o[0] + d[0] * t, o[1] + d[1] * t];
}

const centre = (r: Rect): Point => [r.x + r.w / 2, r.y + r.h / 2];

/** The part of a node's box that lines end on: its `body` at the top middle, else the whole box. */
export function bodyOf(box: Rect, n: GraphNode | undefined): Rect {
  const b = n?.body;
  return b === undefined ? box : { x: box.x + (box.w - b.width) / 2, y: box.y, w: b.width, h: b.height };
}

/**
 * The point on the outline in direction `d`: exactly on an ellipse in the body, else `GAP` outside the body. A line leaving the
 * body downwards runs on below the box, so it does not strike through what stands below the body, such as a name.
 */
function rim(box: Rect, n: GraphNode | undefined, d: Point): Point {
  const body = bodyOf(box, n);
  const o = centre(body);
  if (n?.shape === 'ellipse') {
    const t = 1 / Math.hypot(d[0] / (body.w / 2), d[1] / (body.h / 2));
    return [o[0] + d[0] * t, o[1] + d[1] * t];
  }
  let hit = exitBox(o, d, body);
  const bottom = body.y + body.h;
  if (body !== box && d[1] > 0 && Math.abs(hit[1] - bottom) < 0.01 && bottom < box.y + box.h)
    hit = exitBox(hit, d, box);
  return [hit[0] + d[0] * GAP, hit[1] + d[1] * GAP];
}

const round = (p: Point): Point => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];

function sides(d: Point): { fromSide: Side; toSide: Side } {
  if (Math.abs(d[0]) >= Math.abs(d[1]))
    return d[0] >= 0 ? { fromSide: 'right', toSide: 'left' } : { fromSide: 'left', toSide: 'right' };
  return d[1] >= 0 ? { fromSide: 'bottom', toSide: 'top' } : { fromSide: 'top', toSide: 'bottom' };
}

/**
 * The straight route of edge `edge` between two placed boxes, from outline to outline on the line between the
 * middles of their bodies, rounded to a tenth.
 */
export function straightRoute(
  edge: string,
  a: { readonly rect: Rect; readonly node: GraphNode | undefined },
  b: { readonly rect: Rect; readonly node: GraphNode | undefined },
): Route {
  const [ax, ay] = centre(bodyOf(a.rect, a.node));
  const [bx, by] = centre(bodyOf(b.rect, b.node));
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const d: Point = [(bx - ax) / len, (by - ay) / len];
  return {
    edge,
    points: [round(rim(a.rect, a.node, d)), round(rim(b.rect, b.node, [-d[0], -d[1]]))],
    shape: 'straight',
    ...sides(d),
  };
}
