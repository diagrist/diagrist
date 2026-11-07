import { type Point, type Rect, segmentMeetsRect, segmentsIntersect } from '@diagrist/core';

/** Distance of the docking point from the ends of the line piece it sits on. */
const INSET = 24;
/** A bend of the dashed line weighs as much as this many pixels of it. */
const BEND = 400;

/** What the dashed line keeps clear of: boxes and texts, and the other lines. */
export interface Clear {
  readonly boxes: readonly Rect[];
  readonly lines: readonly (readonly Point[])[];
}

/** The middles of the four sides of a box, with the axis a line reaches them along: 1 vertical, 0 horizontal. */
const targetsOf = (b: Rect): { p: Point; axis: 0 | 1; sign: number }[] => [
  { p: [b.x + b.w / 2, b.y], axis: 1, sign: 1 },
  { p: [b.x + b.w / 2, b.y + b.h], axis: 1, sign: -1 },
  { p: [b.x, b.y + b.h / 2], axis: 0, sign: 1 },
  { p: [b.x + b.w, b.y + b.h / 2], axis: 0, sign: -1 },
];

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** The paths with at most one bend from a straight piece `a`-`b` of the line to the middle of a side of `box`. */
function candidates(a: Point, b: Point, box: Rect): Point[][] {
  const axis = a[1] === b[1] ? 0 : a[0] === b[0] ? 1 : undefined;
  if (axis === undefined) return [];
  const across = axis === 0 ? 1 : 0;
  const lo = Math.min(a[axis], b[axis]);
  const hi = Math.max(a[axis], b[axis]);
  const [l, h] = hi - lo > 2 * INSET ? [lo + INSET, hi - INSET] : [(lo + hi) / 2, (lo + hi) / 2];
  const at = (v: number): Point => (axis === 0 ? [v, a[1]] : [a[0], v]);
  return targetsOf(box).flatMap(({ p, axis: reach, sign }): Point[][] => {
    const gap = p[reach] - a[reach];
    if (reach === across) {
      if (Math.sign(gap) !== sign) return [];
      return p[axis] >= l && p[axis] <= h ? [[at(p[axis]), p]] : [];
    }
    const out = [...new Set([(l + h) / 2, l, h, clamp(p[axis] - sign * INSET, l, h)])];
    return out.flatMap((v): Point[][] => {
      const corner: Point = reach === 0 ? [v, p[1]] : [p[0], v];
      const start = at(v);
      if (Math.sign(p[reach] - corner[reach]) !== sign || (corner[0] === start[0] && corner[1] === start[1])) return [];
      return [[start, corner, p]];
    });
  });
}

const length = (path: readonly Point[]) =>
  path
    .slice(1)
    .reduce((s, p, i) => s + Math.abs(p[0] - (path[i] as Point)[0]) + Math.abs(p[1] - (path[i] as Point)[1]), 0);

/** Whether a path runs through a box or text, or meets a line other than at its start on its own line. */
function blocked(path: readonly Point[], own: readonly Point[], box: Rect, clear: Clear): boolean {
  const pieces = path.slice(1).map((p, i) => [path[i] as Point, p] as const);
  const inner = (r: Rect): Rect => ({ x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 });
  if (pieces.some(([p, q]) => [...clear.boxes, box].some((r) => segmentMeetsRect(p, q, inner(r))))) return true;
  const meets = (line: readonly Point[], skipStart: boolean) =>
    line
      .slice(1)
      .some((q, i) =>
        pieces.some(([p1, p2], k) => (skipStart && k === 0 ? false : segmentsIntersect(p1, p2, line[i] as Point, q))),
      );
  return meets(own, true) || clear.lines.some((l) => meets(l, false));
}

/**
 * The dashed line of an association class: from a straight piece of its association to the middle of a side of the
 * class, straight where it can be, else with one bend, through no box or text and across no line; of those the one
 * with fewest bends, then the shortest, then the one leaving nearest the middle of the association. Undefined where
 * every such path is blocked.
 */
export function tetherPath(line: readonly Point[], box: Rect, clear: Clear): Point[] | undefined {
  const total = length(line);
  const along = (p: Point) => {
    let s = 0;
    for (let i = 0; i + 1 < line.length; i++) {
      const [a, b] = [line[i] as Point, line[i + 1] as Point];
      const inside = p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]);
      if (inside && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]))
        return s + Math.abs(p[0] - a[0]) + Math.abs(p[1] - a[1]);
      s += length([a, b]);
    }
    return s;
  };
  const scored = line
    .slice(1)
    .flatMap((b, i) => candidates(line[i] as Point, b, box))
    .filter((path) => !blocked(path, line, box, clear))
    .map((path) => ({
      path,
      cost: BEND * (path.length - 2) + length(path) + Math.abs(along(path[0] as Point) - total / 2) / 4,
    }));
  return scored.sort((x, y) => x.cost - y.cost)[0]?.path;
}
