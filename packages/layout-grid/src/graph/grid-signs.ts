import type { Point, Rect } from '@diagrist/core';
import { longestSegment, pointAlong } from '../geometry.js';
import { labelEdges } from '../label/index.js';
import { signEdges } from '../label/signs.js';
import { markAt } from '../label/spots.js';
import type { EdgeLabel } from '../label/types.js';
import type { GridLayout, Route } from '../layout.js';
import { fitFrames } from '../place/fit.js';
import type { GridSpec } from '../spec.js';
import type { GraphCells, PlacedSign } from './cells.js';
import { cornerSpots, pinSpots } from './corners.js';

/** The texts and signs of a grid as placed, and the grid with its frames grown around them where it is adaptive. */
export interface CellSigns {
  readonly grid: GridLayout;
  readonly labels: readonly EdgeLabel[];
  readonly numbers: readonly PlacedSign[];
  readonly pins: readonly PlacedSign[];
  readonly corners: readonly (Point | undefined)[];
  /** Routes whose texts found no clear spot, for the gaps to grow (`gutterRoom`). */
  readonly crowded: readonly number[];
}

/** The heads of the frames where their kind draws them. */
const headsOf = (spec: GridSpec, placed: GridLayout): Rect[] =>
  spec.groups.flatMap((g) => {
    const h = g.head;
    const r = placed.groups.find((p) => p.id === g.id)?.rect;
    if (!h || !r) return [];
    return [{ x: (h.origin === 'middle' ? r.x + r.w / 2 : r.x) + h.x, y: r.y + h.y, w: h.w, h: h.h }];
  });

/**
 * Corners, pins, numbers and texts of a grid, through its channels: signs at corners first, clear of boxes, frames,
 * heads and lines, then pins, numbers and texts clear of them and of each other (`signEdges`). A text of an
 * adaptive grid stays where `labelEdges` seats it while that is clear; frames of an adaptive grid then grow around
 * the routes between their own nodes and the texts and numbers on them.
 */
export function signCells(cells: GraphCells, spec: GridSpec, placed: GridLayout, routes: readonly Route[]): CellSigns {
  const s = cells.signs ?? {};
  const numbers = s.numbers ?? { w: 0, h: 0, room: 0, offset: 0, edges: [] };
  const pin = s.pins ?? { w: 0, h: 0, edges: [] };
  const counted = new Set(numbers.edges);
  const pinned = new Set(pin.edges);
  const free = routes.flatMap((r, route) => {
    if (!counted.has(r.edge)) return [];
    const { p1, p2, len } = longestSegment(r.points);
    const { p } = pointAlong([p1, p2], Math.min(numbers.offset, len / 2));
    return [{ edge: r.edge, route, x: p[0], y: p[1] }];
  });
  const corners = s.corners ? cornerSpots(s.corners, placed, routes, headsOf(spec, placed)) : [];
  const size = s.corners ?? { w: 0, h: 0 };
  const avoid = corners.flatMap((at) => (at ? [markAt(at, size.w, size.h)] : []));
  const onPins = routes.flatMap((r, route) => (pinned.has(r.edge) ? [{ edge: r.edge, route }] : []));
  const at = onPins.map(({ route }) => ({ route, spots: pinSpots(routes[route]?.points ?? []) }));
  const options = { preferFlat: cells.preferFlat === true, ...(cells.onLine ? { onLine: cells.onLine } : {}) };
  const seats = spec.adaptive ? { placed: labelEdges(spec, placed, routes, cells.texts, options) } : {};
  const signed = signEdges(spec, placed, routes, cells.texts, free, {
    ...options,
    avoid,
    mark: { w: numbers.w, h: numbers.h, room: numbers.room },
    pins: { w: pin.w, h: pin.h, at },
    ...seats,
  });
  const pins = onPins.map((k, i) => {
    const spot = signed.pins[i] as Point;
    return { ...k, x: spot[0], y: spot[1] };
  });
  const boxes = [
    ...signed.labels,
    ...signed.marks.map((b) => ({ route: b.route, box: markAt([b.x, b.y], numbers.w, numbers.h) })),
  ];
  return {
    grid: spec.adaptive ? fitFrames(spec, placed, routes, boxes) : placed,
    labels: signed.labels,
    numbers: signed.marks,
    pins,
    corners,
    crowded: signed.crowded,
  };
}
