import { type LineInput, type Point, type Rect, segmentMeetsRect, segmentsIntersect } from '@diagrist/core';
import type { Route } from '../layout.js';
import { DETOUR } from '../score.js';
import type { LayeredSpec } from './spec.js';

/** Distance of the point a hanging line leaves from the ends of the straight piece it sits on. */
const INSET = 24;
/** A bend of a hanging line weighs as much as this many pixels of it, as `scoreOf` weighs a bend against length. */
const BEND = 200;

/** A box that hangs from a line, the id of the line drawn between them and the line it hangs from. */
interface Hanging {
  readonly id: string;
  readonly box: string;
  readonly line: string;
}

/** The boxes hanging from lines (`LayeredEdge.hang`), once each, in the order of their first holding edge. */
function hangingOf(spec: LayeredSpec): Hanging[] {
  const seen = new Map<string, Hanging>();
  for (const e of spec.edges)
    if (e.hang !== undefined && !seen.has(e.hang.id))
      seen.set(e.hang.id, { id: e.hang.id, box: e.hang.box, line: e.hang.line });
  return [...seen.values()];
}

/** The middles of the four sides of a box, with the axis a line reaches them along (1 vertical) and its sign. */
const targetsOf = (b: Rect): { p: Point; axis: 0 | 1; sign: number }[] => [
  { p: [b.x + b.w / 2, b.y], axis: 1, sign: 1 },
  { p: [b.x + b.w / 2, b.y + b.h], axis: 1, sign: -1 },
  { p: [b.x, b.y + b.h / 2], axis: 0, sign: 1 },
  { p: [b.x + b.w, b.y + b.h / 2], axis: 0, sign: -1 },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/**
 * The paths from the straight piece `a`-`b` of a line to the middle of a side of `box`: straight across, with one
 * bend, or, to a side facing the piece but beyond its reach, with a step halfway across.
 */
function candidates(a: Point, b: Point, box: Rect): Point[][] {
  const axis = a[1] === b[1] ? 0 : a[0] === b[0] ? 1 : undefined;
  if (axis === undefined) return [];
  const across = axis === 0 ? 1 : 0;
  const [lo, hi] = [Math.min(a[axis], b[axis]), Math.max(a[axis], b[axis])];
  const [l, h] = hi - lo > 2 * INSET ? [lo + INSET, hi - INSET] : [(lo + hi) / 2, (lo + hi) / 2];
  const at = (v: number): Point => (axis === 0 ? [v, a[1]] : [a[0], v]);
  const pt = (v: number, w: number): Point => (axis === 0 ? [v, w] : [w, v]);
  return targetsOf(box).flatMap(({ p, axis: reach, sign }): Point[][] => {
    if (reach === across) {
      if (Math.sign(p[reach] - a[reach]) !== sign) return [];
      if (p[axis] >= l && p[axis] <= h) return [[at(p[axis]), p]];
      const w = (a[across] + p[across]) / 2;
      return [...new Set([clamp(p[axis], l, h), (l + h) / 2])].map((v) => [at(v), pt(v, w), pt(p[axis], w), p]);
    }
    return [...new Set([(l + h) / 2, l, h, clamp(p[axis] - 2 * sign * INSET, l, h)])].flatMap((v): Point[][] => {
      const corner: Point = reach === 0 ? [v, p[1]] : [p[0], v];
      const start = at(v);
      if (Math.sign(p[reach] - corner[reach]) !== sign || (corner[0] === start[0] && corner[1] === start[1])) return [];
      return [[start, corner, p]];
    });
  });
}

const lengthOf = (path: readonly Point[]) =>
  path
    .slice(1)
    .reduce((s, p, i) => s + Math.abs(p[0] - (path[i] as Point)[0]) + Math.abs(p[1] - (path[i] as Point)[1]), 0);

/** Whether a bent path bends sooner than `INSET` after either end, so it seems to start or end elsewhere. */
const short = (path: readonly Point[]) => lengthOf(path.slice(0, 2)) < INSET || lengthOf(path.slice(-2)) < INSET;

/** How far along `line` the point `p` lies. */
function along(line: readonly Point[], p: Point): number {
  let s = 0;
  for (let i = 0; i + 1 < line.length; i++) {
    const [a, b] = [line[i] as Point, line[i + 1] as Point];
    const inside = p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]);
    if (inside && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1])) return s + lengthOf([a, p]);
    s += lengthOf([a, b]);
  }
  return s;
}

/** Whether two axis-parallel pieces lie on one another for more than a pixel. */
function onOneAnother(p: Point, q: Point, r: Point, s: Point): boolean {
  for (const k of [0, 1] as const) {
    const o = k === 0 ? 1 : 0;
    if (p[o] !== q[o] || r[o] !== s[o] || p[o] !== r[o]) continue;
    const lo = Math.max(Math.min(p[k], q[k]), Math.min(r[k], s[k]));
    const hi = Math.min(Math.max(p[k], q[k]), Math.max(r[k], s[k]));
    if (hi - lo > 1) return true;
  }
  return false;
}

/** What the boxes and the lines drawn so far make a hanging line cost besides its length: crossings and boxes. */
function hindrance(
  path: readonly Point[],
  own: readonly Point[],
  boxes: readonly Rect[],
  lines: readonly (readonly Point[])[],
): number {
  const pieces = path.slice(1).map((p, i) => [path[i] as Point, p] as const);
  const inner = (r: Rect): Rect => ({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 });
  const through = pieces.filter(([p, q]) => boxes.some((r) => segmentMeetsRect(p, q, inner(r)))).length;
  const meets = (line: readonly Point[], skipStart: boolean) =>
    line.slice(1).reduce((n, q, i) => {
      const r = line[i] as Point;
      return (
        n +
        pieces.filter(
          ([p1, p2], k) => !(skipStart && k === 0) && (segmentsIntersect(p1, p2, r, q) || onOneAnother(p1, p2, r, q)),
        ).length
      );
    }, 0);
  return 10 * DETOUR * through + DETOUR * (meets(own, true) + lines.reduce((n, l) => n + meets(l, false), 0));
}

/**
 * The line of a box hanging from a line: from a straight piece of the line to the middle of a side of the box,
 * straight where it can be, else with one bend or a step; of those the cheapest, its length with `BEND` for a bend,
 * `DETOUR` for each line it crosses or lies on and for a bend sooner than `INSET` after an end, far more for a box it
 * runs through, and a little for leaving away from the middle of the line. Its points run from the box to the line.
 */
function hangingPath(line: readonly Point[], box: Rect, boxes: readonly Rect[], lines: readonly (readonly Point[])[]) {
  const total = lengthOf(line);
  const priced = line
    .slice(1)
    .flatMap((b, i) => candidates(line[i] as Point, b, box))
    .map((path) => ({
      path,
      cost:
        BEND * (path.length - 2) +
        lengthOf(path) +
        hindrance(path, line, [...boxes, box], lines) +
        (path.length > 2 && short(path) ? DETOUR : 0) +
        Math.abs(along(line, path[0] as Point) - total / 2) / 4,
    }));
  return priced.sort((x, y) => x.cost - y.cost)[0]?.path.reverse();
}

/** The side of `box` a path ends on. */
function sideOf(p: Point, box: Rect): Route['fromSide'] {
  if (p[1] === box.y) return 'top';
  if (p[1] === box.y + box.h) return 'bottom';
  return p[0] === box.x ? 'left' : 'right';
}

/**
 * The lines of the boxes that hang from lines (`GraphEdge.hang`), drawn once the other routes stand, each clear of
 * the boxes and the lines before it where it can be (`hangingPath`); a box whose line has no route gets none.
 */
export function tetherRoutes(spec: LayeredSpec, rects: ReadonlyMap<string, Rect>, routes: readonly Route[]): Route[] {
  const hanging = hangingOf(spec);
  if (hanging.length === 0) return [];
  const byEdge = new Map(routes.map((r) => [r.edge, r]));
  const drawn: Route[] = [];
  for (const h of hanging) {
    const [line, box] = [byEdge.get(h.line), rects.get(h.box)];
    if (line === undefined || box === undefined || line.points.length < 2) continue;
    const boxes = [...rects].filter(([id]) => id !== h.box).map(([, r]) => r);
    const others = [...routes.filter((r) => r !== line), ...drawn].map((r) => r.points);
    const path = hangingPath(line.points, box, boxes, others);
    if (path === undefined) continue;
    const side = sideOf(path[0] as Point, box);
    drawn.push({ edge: h.id, points: path, shape: path.length === 2 ? 'straight' : 'L', fromSide: side, toSide: side });
  }
  return drawn;
}

/**
 * The lines of a laid out picture with each line of a box hanging from a line read as the line check reads it in a
 * drawing: from the box to the line it hangs from, of `weight`, and in one bundle with that line, so their meeting and
 * the texts of that line near it are no finding.
 */
export function hungLines(spec: LayeredSpec, weight: number, input: LineInput): LineInput {
  const hanging = new Map(hangingOf(spec).map((h) => [h.id, h]));
  if (hanging.size === 0) return input;
  const joined = [...hanging.values()].flatMap((h) => [h.id, h.line].map((edge) => [edge, `on ${h.id}`] as const));
  const routes = input.routes.map((r) => {
    const h = hanging.get(r.edge);
    const on = joined.filter(([edge]) => edge === r.edge).map(([, key]) => key);
    const read = h === undefined ? r : { ...r, from: h.box, to: h.line, weight };
    return on.length === 0 ? read : { ...read, bundles: [...(read.bundles ?? []), ...on] };
  });
  return { ...input, routes };
}
