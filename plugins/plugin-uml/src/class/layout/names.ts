import { type Point, type Rect, STANDARD_FONTS, segmentMeetsRect } from '@diagrist/core';
import { type EdgeLabel, overlaps, type Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import { nameLines, nameOf } from './layered.js';
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

/** Steps a name slides by along a horizontal piece when the middle is taken. */
const SLIDE = 16;

/** A name: its lines, top first, placed together. */
type Name = readonly EdgeLabel[];

/** The lines of a name with their widths. */
type Lines = readonly { readonly text: string; readonly width: number }[];

/** The rectangle around all lines of a name. */
function boxOf(name: Name): Rect {
  const [x, y] = [Math.min(...name.map((l) => l.box.x)), Math.min(...name.map((l) => l.box.y))];
  const right = Math.max(...name.map((l) => l.box.x + l.box.w));
  return { x, y, w: right - x, h: Math.max(...name.map((l) => l.box.y + l.box.h)) - y };
}

/**
 * A name at its place beside the segment from `p` to `q`, above or below, right or left of it; along a horizontal
 * piece `slide` pixels from its middle. Its lines stand one under the other, centred over a horizontal piece and
 * flush with the side of a vertical one.
 */
function beside(lines: Lines, p: Point, q: Point, side: 1 | -1, route: number, slide = 0): Name {
  const size = STANDARD_FONTS.label.size;
  const gap = LAYERED.labelGap;
  const line = size + 2;
  const h = lines.length * line;
  const flat = p[1] === q[1];
  const top = flat ? (side < 0 ? p[1] - gap - h : p[1] + gap) : (p[1] + q[1]) / 2 - h / 2;
  const x = flat ? (p[0] + q[0]) / 2 + slide : p[0] + side * gap;
  const anchor: EdgeLabel['anchor'] = flat ? 'middle' : side > 0 ? 'start' : 'end';
  return lines.map(({ text, width: w }, i) => {
    const y = top + i * line;
    const left = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x : x - w;
    return { text, x, y: y + size, anchor, box: { x: left, y, w, h: line }, route, part: 'name' };
  });
}

/** Is a name clear of boxes, by `APART` of other names, and by `CLEAR` of the lines of other relations? */
function isFree(name: Name, taken: Taken, names: readonly Rect[]): boolean {
  return name.every((l) => {
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
  });
}

/**
 * Places for a name along a route: above or below its longest horizontal pieces, from the middle outwards, then
 * beside its vertical ones.
 */
function placesOf(lines: Lines, r: Route, i: number): Name[] {
  const w = Math.max(0, ...lines.map((l) => l.width));
  const pieces = r.points
    .slice(1)
    .map((q, k) => [r.points[k] as Point, q] as const)
    .sort(
      ([p, q], [u, v]) => Math.abs(v[0] - u[0]) + Math.abs(v[1] - u[1]) - Math.abs(q[0] - p[0]) - Math.abs(q[1] - p[1]),
    );
  const flat = pieces.filter(([p, q]) => p[1] === q[1]);
  const upright = pieces.filter(([p, q]) => p[0] === q[0]);
  const slides = ([p, q]: readonly [Point, Point]) => {
    const reach = Math.floor((Math.abs(q[0] - p[0]) - w) / 2 / SLIDE - 1);
    return [0, ...Array.from({ length: Math.max(0, reach) }, (_, k) => [(k + 1) * SLIDE, -(k + 1) * SLIDE]).flat()];
  };
  return [
    ...flat.flatMap((piece) =>
      slides(piece).flatMap((d) => [-1, 1].map((side) => beside(lines, piece[0], piece[1], side as 1 | -1, i, d))),
    ),
    ...upright.flatMap(([p, q]) => [beside(lines, p, q, 1, i), beside(lines, p, q, -1, i)]),
  ];
}

/** A line of a name beside a vertical line moved to the other side of it. */
function mirror(l: EdgeLabel): EdgeLabel {
  const gap = LAYERED.labelGap;
  const line = l.anchor === 'start' ? l.x - gap : l.x + gap;
  const x = l.anchor === 'start' ? line - gap : line + gap;
  const box = { ...l.box, x: l.anchor === 'start' ? x - l.box.w : x };
  return { ...l, x, box, anchor: l.anchor === 'start' ? 'end' : 'start' };
}

/**
 * The names the pipeline seated beside the start of their line, each with all its lines, kept there when that place
 * is free of lines the kind drew and of other names, else on the other side of the line or at the places below; then
 * the name of every relation the pipeline left without one, such as a relation drawn beside or one with a package at
 * an end: above the middle of its longest horizontal piece, else beside its longest vertical one, at the first of
 * these places that is free, else at the first. A name of several lines moves as one.
 */
export function nameLabels(
  relations: readonly (ClassRelation | undefined)[],
  routes: readonly Route[],
  seated: readonly EdgeLabel[],
  taken: Taken,
): EdgeLabel[] {
  const blocks = [...new Set(seated.map((l) => l.route))].map((i) => seated.filter((l) => l.route === i));
  const out: Name[] = [];
  blocks.forEach((name, k) => {
    const names = [...out, ...blocks.slice(k + 1)].map(boxOf);
    const route = name[0]?.route ?? 0;
    const r = routes[route];
    const places = [name, name.map(mirror), ...(r ? placesOf(name.map(lineOf), r, route) : [])];
    out.push(places.find((p) => isFree(p, taken, names)) ?? name);
  });
  routes.forEach((r, i) => {
    const rel = relations[i];
    if (rel === undefined || nameOf(rel) === undefined || seated.some((l) => l.route === i)) return;
    const places = placesOf(nameLines(rel), r, i);
    const chosen = places.find((l) => isFree(l, taken, out.map(boxOf))) ?? places[0];
    if (chosen) out.push(chosen);
  });
  return out.flat();
}

/** A placed line of a name as a line to place again. */
const lineOf = (l: EdgeLabel) => ({ text: l.text, width: l.box.w });
