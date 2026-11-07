import { type Point, segmentMeetsRect } from '@diagrist/core';
import type { Pin } from './pin-docks.js';
import type { Placement, Routed } from './placement.js';

/** Object nodes are plain rectangles: a line may leave them anywhere along a side but this near a corner. */
const PLAIN = new Set(['object', 'datastore', 'buffer']);

/** How near a corner of a plain rectangle the other end of a line may come (as `CORNER` of the layered ports). */
const CORNER = 4;

/**
 * Keeps a straight line straight when its pin on the top or bottom moves along the side: the other end of the line
 * moves along as far, where that end stands alone on its side of a plain rectangle, the new place lies on that side
 * at least `CORNER` from its corners, and the line then meets no other node. Without it the line would bend in its
 * middle, and the piece left at the old place could run beside another line into the same side. Moves `pts` in
 * place.
 */
export function followPin(
  pin: Pin,
  at: Point,
  route: Routed,
  pts: Point[],
  pl: Placement,
  routes: readonly Routed[],
): void {
  if ((pin.side !== 'top' && pin.side !== 'bottom') || pts.length !== 2) return;
  const [a, b] = pts as [Point, Point];
  if (a[0] !== b[0] || a[0] === at[0]) return;
  const [id, side] = pin.out ? [route.flow.to, route.toSide] : [route.flow.from, route.fromSide];
  const far = pl.nodes.get(id);
  if (!far || !PLAIN.has(far.node.kind) || far.node.port !== undefined) return;
  const r = far.rect;
  if (at[0] < r.x + CORNER || at[0] > r.x + r.w - CORNER) return;
  const others = routes.filter(
    (o) => o !== route && ((o.flow.from === id && o.fromSide === side) || (o.flow.to === id && o.toSide === side)),
  );
  if (others.length > 0) return;
  const moved: [Point, Point] = [
    [at[0], a[1]],
    [at[0], b[1]],
  ];
  const own = new Set([route.flow.from, route.flow.to]);
  for (const [k, n] of pl.nodes) if (!own.has(k) && segmentMeetsRect(moved[0], moved[1], n.rect, 0)) return;
  pts.splice(0, 2, ...moved);
}
