import type { Point, Rect } from '@diagrist/core';
import { overlaps } from '../geometry.js';
import type { GridLayout, PlacedNode, Route } from '../layout.js';
import { ellipseIn } from '../route/snap.js';
import type { GridSpec } from '../spec.js';
import { segmentMeetsEllipse, segmentMeetsRect, segmentsIntersect } from './segment.js';

/** Air between a text and foreign lines, nodes or frames. */
const AIR = 3;
/** Frame lines keep more distance: a text close to the border reads as if on it. */
const FRAME_AIR = 10;
/** So do nodes with a caption: a text next to it must not read as part of the name. */
const CAPTION_AIR = 8;
/** Weight per conflict: a node weighs more than a text, a text more than a line, a frame line least. */
const COST = { node: 100, text: 20, line: 10, frame: 5 } as const;

/**
 * Taken room for free placements, such as labels and notes on straight lines: nodes, lines, frame lines and texts
 * already set. `cost` is 0 for a free box, else the weighted number of conflicts. `link` weighs a connector line
 * from `a` to `b` (nodes except `skip`, routes except index `own`, texts, frame lines it crosses). `take` adds a box.
 */
export interface Occupancy {
  cost(box: Rect): number;
  link(a: Point, b: Point, own: number, skip?: string): number;
  take(box: Rect): void;
}

/** Does the box cut the line of a frame, instead of lying well inside or outside? */
function onFrame(box: Rect, frame: Rect): boolean {
  if (!overlaps(box, frame, FRAME_AIR)) return false;
  const inside =
    box.x >= frame.x + FRAME_AIR &&
    box.y >= frame.y + FRAME_AIR &&
    box.x + box.w <= frame.x + frame.w - FRAME_AIR &&
    box.y + box.h <= frame.y + frame.h - FRAME_AIR;
  return !inside;
}

const within = (p: Point, r: Rect): boolean => p[0] > r.x && p[0] < r.x + r.w && p[1] > r.y && p[1] < r.y + r.h;

/**
 * Occupancy of a laid out grid with its straight routes (each counts from its first to its last point). `frames`
 * default to the placed frames; outside `area`, if given, there is no room at all.
 */
export function occupancy(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  options: { readonly frames?: readonly Rect[]; readonly area?: Rect } = {},
): Occupancy {
  const frames = options.frames ?? layout.groups.map((g) => g.rect);
  const area = options.area;
  const shapes = new Map(spec.nodes.map((n) => [n.id, n]));
  const ellipse = (n: PlacedNode) => (shapes.get(n.id)?.shape === 'ellipse' ? ellipseIn(n.rect) : undefined);
  const taken: Rect[] = [];
  const outside = (box: Rect) =>
    area !== undefined &&
    (box.x < area.x || box.y < area.y || box.x + box.w > area.x + area.w || box.y + box.h > area.y + area.h);
  const onNode = (box: Rect) =>
    layout.nodes.filter((n) => {
      if (!overlaps(box, n.rect, shapes.get(n.id)?.caption ? CAPTION_AIR : AIR)) return false;
      const e = ellipse(n);
      if (!e) return true;
      const corners: Point[] = [
        [box.x, box.y],
        [box.x + box.w, box.y],
        [box.x + box.w, box.y + box.h],
        [box.x, box.y + box.h],
      ];
      const centre: Point = [box.x + box.w / 2, box.y + box.h / 2];
      const c: Point = [e.cx, e.cy];
      return (
        segmentMeetsEllipse(centre, centre, c, e.rx, e.ry, AIR) ||
        corners.some((p, i) => segmentMeetsEllipse(p, corners[(i + 1) % 4] as Point, c, e.rx, e.ry, AIR))
      );
    }).length;
  const ends = (r: Route): [Point, Point] => [r.points[0] as Point, r.points.at(-1) as Point];
  return {
    cost: (box) =>
      COST.node * (onNode(box) + (outside(box) ? 1 : 0)) +
      COST.text * taken.filter((t) => overlaps(box, t, AIR)).length +
      COST.frame * frames.filter((f) => onFrame(box, f)).length +
      COST.line * routes.filter((r) => segmentMeetsRect(...ends(r), box, AIR)).length,
    link: (a, b, own, skip) =>
      COST.node *
        layout.nodes.filter((n) => {
          if (n.id === skip) return false;
          const e = ellipse(n);
          return e ? segmentMeetsEllipse(a, b, [e.cx, e.cy], e.rx, e.ry) : segmentMeetsRect(a, b, n.rect);
        }).length +
      COST.text * taken.filter((t) => segmentMeetsRect(a, b, t)).length +
      COST.line * routes.filter((r, i) => i !== own && segmentsIntersect(a, b, ...ends(r))).length +
      COST.frame * frames.filter((f) => within(a, f) !== within(b, f)).length,
    take: (box) => {
      taken.push(box);
    },
  };
}

/** The candidate with the fewest conflicts, the first on a tie; `extra` adds a cost of its own. */
export function cheapest<T>(
  candidates: readonly T[],
  box: (c: T) => Rect,
  room: Occupancy,
  extra: (c: T) => number = () => 0,
): T | undefined {
  let best = candidates[0];
  let bestCost = Number.POSITIVE_INFINITY;
  for (const c of candidates) {
    const cost = room.cost(box(c)) + extra(c);
    if (cost < bestCost) {
      best = c;
      bestCost = cost;
      if (cost === 0) break;
    }
  }
  return best;
}
