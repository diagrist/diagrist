import type { Point, Rect } from '@diagrist/core';
import { type PlacedSign, pointAlong, polylineLength } from '@diagrist/layout-grid';
import type { Look } from '../../looks/look.js';
import type { ArchitectureModel } from '../../model/types.js';
import { MARK, NUMBER_SIZE } from '../marks.js';
import { lineMeets, meets } from './geometry.js';
import type { StarLine } from './lines.js';

/** How far before the head a mark stands, how far aside, and how far further back its later spots lie. */
const PIN = { back: 30, aside: 18, step: 16 } as const;
/** How far apart the spots a flow number tries along its line lie, and how far it keeps from other lines. */
const NUMBER_STEP = 8;
const LINE_CLEAR = 7;
/** How far a flow number on one of a pair of lines moves outwards, away from the other line. */
const PAIR_SHIFT = 6;
/** How far a mark at a node stands out from its corner. */
const OUT = 20;

/** Flow numbers, marks on lines and marks at nodes, and the rectangles they cover. */
export interface StarSigns {
  readonly numbers: readonly PlacedSign[];
  readonly pins: readonly PlacedSign[];
  readonly corners: readonly { readonly node: string; readonly x: number; readonly y: number }[];
  readonly rects: readonly Rect[];
}

const box = ([x, y]: Point, size: { w: number; h: number }): Rect => ({
  x: x - size.w / 2,
  y: y - size.h / 2,
  ...size,
});

/**
 * The signs of the lines and nodes: a flow number on its line a little after the start, further on where another
 * line passes close, a decision mark beside its
 * line before the head, a decision mark at a node outside one of its corners, the top right first; each where it
 * meets no box, other line or sign before it.
 */
export function signsOfStar(
  model: ArchitectureModel,
  lines: readonly StarLine[],
  look: Look,
  rects: ReadonlyMap<string, Rect>,
  boxes: readonly Rect[],
): StarSigns {
  const number = NUMBER_SIZE[look.options.numbers.form];
  const taken: Rect[] = [];
  const free = (r: Rect, own: number, clear = 2) =>
    !boxes.some((b) => meets(r, b, 2)) &&
    !taken.some((t) => meets(r, t, 2)) &&
    !lines.some((l, k) => k !== own && lineMeets(l.points, r, clear));
  const numbers = lines.flatMap((l, route): PlacedSign[] => {
    if (!l.edge.step) return [];
    const length = polylineLength(l.points);
    const spots: Point[] = [];
    for (
      let d = Math.min(look.metrics.badgeOffset, length / 3);
      d <= length / 2 || spots.length === 0;
      d += NUMBER_STEP
    ) {
      const { p, dir } = pointAlong(l.points, d);
      spots.push([p[0] + dir[1] * l.side * PAIR_SHIFT, p[1] - dir[0] * l.side * PAIR_SHIFT]);
    }
    const p = spots.find((at) => free(box(at, number), route, LINE_CLEAR)) ?? (spots[0] as Point);
    taken.push(box(p, number));
    return [{ edge: String(l.edge.index), route, x: p[0], y: p[1] }];
  });
  const pins = lines.flatMap((l, route): PlacedSign[] => {
    if (!l.edge.mark) return [];
    const length = polylineLength(l.points);
    const spots: Point[] = [];
    for (let back = PIN.back; back < length - PIN.back || back === PIN.back; back += PIN.step) {
      const { p, dir } = pointAlong(l.points, Math.max(0, length - back));
      for (const s of [1, -1]) spots.push([p[0] + dir[1] * PIN.aside * s, p[1] - dir[0] * PIN.aside * s]);
    }
    const at = spots.find((p) => free(box(p, MARK), route)) ?? (spots[0] as Point);
    taken.push(box(at, MARK));
    return [{ edge: String(l.edge.index), route, x: at[0], y: at[1] }];
  });
  const corners = model.nodes.flatMap((n) => {
    const r = n.mark ? rects.get(n.id) : undefined;
    if (!r) return [];
    const spots: Point[] = [
      [r.x + r.w + OUT, r.y - 2],
      [r.x + r.w - OUT, r.y - OUT + 2],
      [r.x - OUT, r.y - 2],
      [r.x + r.w + OUT, r.y + r.h + 2],
      [r.x - OUT, r.y + r.h + 2],
    ];
    const at = spots.find((p) => free(box(p, MARK), -1)) ?? (spots[0] as Point);
    taken.push(box(at, MARK));
    return [{ node: n.id, x: at[0], y: at[1] }];
  });
  return { numbers, pins, corners, rects: [...taken] };
}
