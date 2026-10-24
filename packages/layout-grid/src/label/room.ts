import type { Point, Rect } from '@diagrist/core';
import { overlaps, segmentHitsRect } from '../geometry.js';
import type { Route } from '../layout.js';
import type { Board } from '../route/boxes.js';
import { type Ellipse, ellipseOf } from '../route/snap.js';
import type { EdgeLabel } from './types.js';

/** Does the rectangle lie on the ellipse? The nearest point of the rectangle to the centre, in the unit circle. */
export function rectMeetsEllipse(r: Rect, e: Ellipse, pad = 0): boolean {
  const nx = Math.min(Math.max(e.cx, r.x - pad), r.x + r.w + pad);
  const ny = Math.min(Math.max(e.cy, r.y - pad), r.y + r.h + pad);
  return ((nx - e.cx) / e.rx) ** 2 + ((ny - e.cy) / e.ry) ** 2 < 1;
}

/** Whether a rectangle is clear of nodes, frame lines, routes and the labels `taken`. */
export function isFree(board: Board, routes: readonly Route[], taken: readonly EdgeLabel[], rect: Rect): boolean {
  const onNode = board.layout.nodes.some((node) => {
    const ellipse = ellipseOf(board, node.id);
    return ellipse ? rectMeetsEllipse(rect, ellipse, 1) : overlaps(rect, node.rect, 1);
  });
  const inside = (outer: Rect) =>
    rect.x > outer.x && rect.y > outer.y && rect.x + rect.w < outer.x + outer.w && rect.y + rect.h < outer.y + outer.h;
  const onFrame = board.layout.groups.some((group) => overlaps(rect, group.rect, 1) && !inside(group.rect));
  return (
    !onNode &&
    !onFrame &&
    !taken.some((label) => overlaps(rect, label.box, 2)) &&
    !routes.some((route) => segmentsOf(route.points).some(([from, to]) => segmentHitsRect(from, to, rect, 1)))
  );
}

/** The segments of a polyline as pairs of their end points. */
function segmentsOf(points: readonly Point[]): (readonly [Point, Point])[] {
  return points.flatMap((point, index) => {
    const next = points[index + 1];
    return next ? [[point, next] as const] : [];
  });
}
