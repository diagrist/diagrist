import { type Point, type Rect, STANDARD_FONTS, textWidth } from '@diagrist/core';
import { type EdgeLabel, overlaps, type Route, segmentMeetsRect } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import { nameOf } from './layered.js';
import { LAYERED } from './metrics.js';

/** Least distance between a name and a line it does not belong to, and between two names. */
const CLEAR = 12;
const APART = 8;

/** What a name keeps clear of: boxes and heads of frames, and the lines of other relations. */
export interface Taken {
  readonly boxes: readonly Rect[];
  readonly routes: readonly Route[];
  /** Routes that share a trunk with route `i` and may come near its name. */
  readonly mates: (i: number) => ReadonlySet<number>;
}

const grow = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });

/** A name of width `w` at its place beside the segment from `p` to `q`, above or below, right or left of it. */
function beside(text: string, w: number, p: Point, q: Point, side: 1 | -1, route: number): EdgeLabel {
  const size = STANDARD_FONTS.label.size;
  const gap = LAYERED.labelGap;
  const h = size + 2;
  if (p[1] === q[1]) {
    const x = (p[0] + q[0]) / 2;
    const top = side < 0 ? p[1] - gap - h : p[1] + gap;
    return { text, x, y: top + size, anchor: 'middle', box: { x: x - w / 2, y: top, w, h }, route, part: 'name' };
  }
  const top = (p[1] + q[1]) / 2 - h / 2;
  const x = p[0] + side * gap;
  const box = { x: side > 0 ? x : x - w, y: top, w, h };
  return { text, x, y: top + size, anchor: side > 0 ? 'start' : 'end', box, route, part: 'name' };
}

/** Is a name clear of boxes, by `APART` of other names, and by `CLEAR` of the lines of other relations? */
function isFree(l: EdgeLabel, taken: Taken, names: readonly Rect[]): boolean {
  const mates = taken.mates(l.route);
  const zone = grow(l.box, CLEAR - 1);
  return (
    !taken.boxes.some((b) => overlaps(b, l.box, 2)) &&
    !names.some((b) => overlaps(b, l.box, APART)) &&
    !taken.routes.some(
      (o, k) =>
        k !== l.route &&
        !mates.has(k) &&
        o.points.slice(1).some((q, j) => segmentMeetsRect(o.points[j] as Point, q, zone, 0)),
    )
  );
}

/** Places for a name along a route: above or below its longest horizontal pieces, then beside its vertical ones. */
function placesOf(text: string, w: number, r: Route, i: number): EdgeLabel[] {
  const pieces = r.points
    .slice(1)
    .map((q, k) => [r.points[k] as Point, q] as const)
    .sort(
      ([p, q], [u, v]) => Math.abs(v[0] - u[0]) + Math.abs(v[1] - u[1]) - Math.abs(q[0] - p[0]) - Math.abs(q[1] - p[1]),
    );
  const flat = pieces.filter(([p, q]) => p[1] === q[1]);
  const upright = pieces.filter(([p, q]) => p[0] === q[0]);
  return [
    ...flat.flatMap(([p, q]) => [beside(text, w, p, q, -1, i), beside(text, w, p, q, 1, i)]),
    ...upright.flatMap(([p, q]) => [beside(text, w, p, q, 1, i), beside(text, w, p, q, -1, i)]),
  ];
}

/** A name beside a vertical line moved to the other side of it. */
function mirror(l: EdgeLabel): EdgeLabel {
  const gap = LAYERED.labelGap;
  const line = l.anchor === 'start' ? l.x - gap : l.x + gap;
  const x = l.anchor === 'start' ? line - gap : line + gap;
  const box = { ...l.box, x: l.anchor === 'start' ? x - l.box.w : x };
  return { ...l, x, box, anchor: l.anchor === 'start' ? 'end' : 'start' };
}

/**
 * The names the pipeline seated beside the start of their line, kept there when that place is free of lines the kind
 * drew and of other names, else on the other side of the line or at the places below; then the name of every relation the pipeline left without one, such
 * as a relation drawn beside or one with a package at an end: above the middle of its longest horizontal piece, else
 * beside its longest vertical one, at the first of these places that is free, else at the first.
 */
export function nameLabels(
  relations: readonly (ClassRelation | undefined)[],
  routes: readonly Route[],
  seated: readonly EdgeLabel[],
  taken: Taken,
): EdgeLabel[] {
  const out: EdgeLabel[] = [];
  seated.forEach((l, k) => {
    const names = [...out, ...seated.slice(k + 1)].map((x) => x.box);
    const r = routes[l.route];
    const places = [l, mirror(l), ...(r ? placesOf(l.text, l.box.w, r, l.route) : [])];
    out.push(places.find((p) => isFree(p, taken, names)) ?? l);
  });
  routes.forEach((r, i) => {
    const rel = relations[i];
    const text = rel && nameOf(rel);
    if (text === undefined || seated.some((l) => l.route === i)) return;
    const places = placesOf(text, textWidth(text, STANDARD_FONTS.label), r, i);
    const chosen =
      places.find((l) =>
        isFree(
          l,
          taken,
          out.map((o) => o.box),
        ),
      ) ?? places[0];
    if (chosen) out.push(chosen);
  });
  return out;
}
