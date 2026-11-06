import { type Point, type Rect, segmentMeetsRect } from '@diagrist/core';
import { overlaps, pointAlong, polylineLength } from '../geometry.js';
import { markAt } from '../label/spots.js';
import type { GridLayout, Route } from '../layout.js';
import type { GraphSigns } from './cells.js';

/** Room a sign at a corner keeps from lines, boxes and the lines of frames. */
const PAD = 4;
/** How far a sign stands out from the corner of its node, and how far up. */
const OUT = 20;
const UP = 2;
/** How far before the head a pin stands, how far aside, and how far apart its further spots lie along the line. */
const BACK = 24;
const ASIDE = 24;
const STEP = 16;

const holds = (outer: Rect, r: Rect): boolean =>
  r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;

/** The centres a sign at a node may take, best first: beside its top right corner, above it, then the other corners. */
const spotsOf = (r: Rect): Point[] => [
  [r.x + r.w + OUT, r.y - UP],
  [r.x + r.w - OUT, r.y - OUT + UP],
  [r.x + r.w + OUT, r.y + r.h + UP],
  [r.x - OUT, r.y - UP],
  [r.x + OUT, r.y - OUT + UP],
  [r.x - OUT, r.y + r.h + UP],
];

/**
 * The spots a pin beside a line may take, best first, each with the point of the line it stands beside: `BACK`
 * before the end, right of the direction of travel, then left, then each `STEP` further back, as long as the line is
 * long enough; then the same again twice `STEP` further aside, above or below the texts of the line.
 */
export function pinSpots(points: readonly Point[]): { at: Point; on: Point }[] {
  const length = polylineLength(points);
  const out: { at: Point; on: Point }[] = [];
  for (const aside of [ASIDE, ASIDE + 2 * STEP])
    for (let back = BACK; back === BACK || back <= length - BACK; back += STEP) {
      const { p, dir } = pointAlong(points, Math.max(0, length - back));
      for (const side of [1, -1]) out.push({ at: [p[0] - dir[1] * aside * side, p[1] + dir[0] * aside * side], on: p });
    }
  return out;
}

/**
 * Signs at the corners of nodes: inside the box where the kind says how far from its top right corner, else at the
 * first spot around the node that meets no box, no line, no frame line, no head and no sign before it, so a sign
 * beside a node at the edge of a frame does not sit on the frame; one without such a spot stays beside the top right
 * corner. A node not placed has none.
 */
export function cornerSpots(
  corners: NonNullable<GraphSigns['corners']>,
  grid: GridLayout,
  routes: readonly Route[],
  heads: readonly Rect[],
): (Point | undefined)[] {
  const nodes = new Map(grid.nodes.map((n) => [n.id, n.rect]));
  const taken: Rect[] = [];
  return corners.at.map(({ node, inside }) => {
    const rect = nodes.get(node);
    if (!rect) return undefined;
    if (inside) return [rect.x + rect.w - inside.dx, rect.y + inside.dy];
    const clear = (at: Point) => {
      const r = markAt(at, corners.w, corners.h);
      const frame = (g: Rect) => overlaps(r, g, PAD) && !holds(g, r);
      return (
        !grid.nodes.some((n) => overlaps(r, n.rect, PAD)) &&
        !grid.groups.some((g) => frame(g.rect)) &&
        !heads.some((h) => overlaps(r, h, PAD)) &&
        !taken.some((t) => overlaps(r, t, PAD)) &&
        !routes.some((route) =>
          route.points.slice(1).some((q, i) => segmentMeetsRect(route.points[i] as Point, q, r, PAD)),
        )
      );
    };
    const spots = spotsOf(rect);
    const at = spots.find(clear) ?? (spots[0] as Point);
    taken.push(markAt(at, corners.w, corners.h));
    return at;
  });
}
