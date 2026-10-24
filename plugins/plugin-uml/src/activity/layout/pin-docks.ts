import type { Rect } from '@diagrist/core';
import { cx, type Side } from '@diagrist/layout-grid';
import { SIDE_PIN_SLOT } from './extents.js';
import { ACT, SIZE, widthOf, type XY } from './metrics.js';
import type { Routed } from './route.js';

/** A pin of an action with the edges that start at it (output) or end at it (input). */
export interface Pin {
  readonly name: string;
  readonly out: boolean;
  readonly routes: readonly Routed[];
  readonly side: Side;
}

/** Where the edge attaches at the node before the pins are set. */
const end = (p: Pin): XY | undefined => (p.out ? p.routes[0]?.points[0] : p.routes[0]?.points.at(-1));

/** The other end of the edge. */
export const far = (p: Pin): XY | undefined => (p.out ? p.routes[0]?.points.at(-1) : p.routes[0]?.points[0]);

/**
 * Pins left and right below each other, each at the height of its counterpart if it can, so the bolt or object flow
 * arrives straight; at least a slot for name and square between them. When they do not fit so, they are spread
 * evenly.
 */
function sideDocks(group: readonly Pin[], r: Rect, side: Side): XY[] {
  const x = side === 'left' ? r.x : r.x + r.w;
  const lo = r.y + SIZE.label + ACT.pinGap + ACT.pin / 2;
  const hi = r.y + r.h - ACT.pinGap - ACT.pin / 2;
  if (hi - lo < (group.length - 1) * SIDE_PIN_SLOT)
    return group.map((_, i): XY => [x, r.y + (r.h * (i + 1)) / (group.length + 1)]);
  const ys = group.map((p) => Math.min(hi, Math.max(lo, far(p)?.[1] ?? r.y + r.h / 2)));
  for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i] ?? 0, (ys[i - 1] ?? 0) + SIDE_PIN_SLOT);
  ys[ys.length - 1] = Math.min(ys.at(-1) ?? hi, hi);
  for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i] ?? 0, (ys[i + 1] ?? 0) - SIDE_PIN_SLOT);
  return ys.map((y): XY => [x, y]);
}

/**
 * Attachment points of several pins on one side: on top and bottom side by side with equal air, each square with its
 * name; left and right below each other by the height of their counterpart. A single pin sits where its edge
 * arrives, without an edge in the middle.
 */
export function docks(group: readonly Pin[], r: Rect): XY[] {
  const [only] = group;
  if (!only) return [];
  const side = only.side;
  if (group.length === 1) {
    const at = end(only);
    if (at) return [at];
    if (side === 'bottom') return [[cx(r), r.y + r.h]];
    if (side === 'top') return [[cx(r), r.y]];
    return [[side === 'left' ? r.x : r.x + r.w, r.y + r.h / 2]];
  }
  if (side === 'left' || side === 'right') return sideDocks(group, r, side);
  const y = side === 'top' ? r.y : r.y + r.h;
  const widths = group.map((p) => ACT.pin + ACT.pinGap + widthOf.label(p.name));
  const gap = Math.max(0, (r.w - widths.reduce((a, b) => a + b, 0)) / (group.length + 1));
  let x = r.x + gap;
  return widths.map((w): XY => {
    const at: XY = [x + ACT.pin / 2, y];
    x += w + gap;
    return at;
  });
}

/**
 * Puts the start of a rectangular route onto `to`, another point of the same side. The first piece stands across the
 * side and moves along; a route that is one straight line gets an offset in its middle.
 */
export function moveStart(pts: XY[], side: Side, to: XY): void {
  const along = side === 'top' || side === 'bottom' ? 0 : 1;
  const across = 1 - along;
  const [old, next] = [pts[0], pts[1]];
  if (!old || !next || old[along] === to[along]) return;
  if (pts.length >= 3 && next[along] === old[along]) {
    pts[0] = to;
    pts[1] = along === 0 ? [to[0], next[1]] : [next[0], to[1]];
    return;
  }
  const mid = ((old[across] ?? 0) + (next[across] ?? 0)) / 2;
  const a: XY = along === 0 ? [to[0], mid] : [mid, to[1]];
  const b: XY = along === 0 ? [next[0], mid] : [mid, next[1]];
  pts.splice(0, 1, to, a, b);
}

/** As `moveStart`, for the end of the route. */
export function moveEnd(pts: XY[], side: Side, to: XY): void {
  pts.reverse();
  moveStart(pts, side, to);
  pts.reverse();
}
