import type { Point, Rect } from '@diagrist/core';
import type { GridNode, PlacedGroup, PlacedNode, Route } from '@diagrist/layout-grid';
import { UC } from './metrics.js';

/** Where a ray from `o` inside the rectangle leaves it. */
function exitBox(o: Point, d: Point, r: Rect): Point {
  const along = (from: number, dir: number, lo: number, hi: number) =>
    dir > 0 ? (hi - from) / dir : dir < 0 ? (lo - from) / dir : Number.POSITIVE_INFINITY;
  const t = Math.max(0, Math.min(along(o[0], d[0], r.x, r.x + r.w), along(o[1], d[1], r.y, r.y + r.h)));
  return [o[0] + d[0] * t, o[1] + d[1] * t];
}

const centre = (r: Rect): Point => [r.x + r.w / 2, r.y + r.h / 2];

/**
 * The point on the outline of a node towards `to`, `UC.endGap` outside: exactly on an ellipse; below a stick figure
 * under its role, so the link does not strike through the name. The same rule as the straight lines.
 */
export function rim(p: PlacedNode, n: GridNode | undefined, to: Point): Point {
  const r = p.rect;
  const o = centre(r);
  const len = Math.hypot(to[0] - o[0], to[1] - o[1]) || 1;
  const d: Point = [(to[0] - o[0]) / len, (to[1] - o[1]) / len];
  if (n?.shape === 'ellipse') {
    const t = 1 / Math.hypot(d[0] / (r.w / 2), d[1] / (r.h / 2));
    return [o[0] + d[0] * t, o[1] + d[1] * t];
  }
  let hit = exitBox(o, d, r);
  const c = n?.caption;
  const label = c && { x: o[0] - c.w / 2, y: r.y + r.h, w: c.w, h: c.below };
  if (label && d[1] > 0 && Math.abs(hit[1] - (r.y + r.h)) < 0.01 && hit[0] >= label.x && hit[0] <= label.x + label.w)
    hit = exitBox(hit, d, label);
  return [hit[0] + d[0] * UC.endGap, hit[1] + d[1] * UC.endGap];
}

/** What the links of notes start at: the placed nodes with their models, the frames, the routes by relation. */
export interface Anchors {
  readonly node: (id: string) => { readonly placed: PlacedNode; readonly model?: GridNode } | undefined;
  readonly frame: (id: string) => PlacedGroup | undefined;
  readonly route: (relation: number) => number | undefined;
  readonly routes: readonly Route[];
}
