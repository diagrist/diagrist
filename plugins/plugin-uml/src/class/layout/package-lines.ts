import type { Point, Rect } from '@diagrist/core';
import type { GridLayout, Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import type { ClassModel } from '../model.js';
import { CLASS, tabWidth } from './metrics.js';

/** Distance between two parallel lines and step of the search. */
const STEP = 32;
const NEAR = 10;

type Relations = readonly (ClassRelation | undefined)[];

/** Does a vertical piece at `x` run on or close beside a vertical piece of another line? */
function crowded(x: number, y1: number, y2: number, others: readonly Route[]): boolean {
  const [lo, hi] = [Math.min(y1, y2), Math.max(y1, y2)];
  return others.some((o) =>
    o.points.slice(1).some((q, k) => {
      const p = o.points[k] ?? q;
      return p[0] === q[0] && Math.abs(p[0] - x) < NEAR && Math.max(p[1], q[1]) > lo && Math.min(p[1], q[1]) < hi;
    }),
  );
}

const crosses = (x: number, y1: number, y2: number, r: Rect) =>
  x < r.x + r.w + 2 && x > r.x - 2 && Math.min(y1, y2) < r.y + r.h + 2 && Math.max(y1, y2) > r.y - 2;

/** A straight vertical dependency of a package, with the rectangles of both its ends. */
function vertical(r: Route, rel: ClassRelation | undefined, m: ClassModel, grid: GridLayout) {
  const [a, b] = r.points;
  if (!rel || !a || !b || r.points.length !== 2 || a[0] !== b[0]) return undefined;
  if (!m.packages.has(rel.from) && !m.packages.has(rel.to)) return undefined;
  const rect = (id: string) => (grid.nodes.find((n) => n.id === id) ?? grid.groups.find((g) => g.id === id))?.rect;
  const [ra, rb] = [rect(rel.from), rect(rel.to)];
  return ra && rb ? { a, b, ra, rb } : undefined;
}

/** The first free x of `candidates` where a vertical line from `a` to `b` touches no box and runs beside no line. */
function freeX(candidates: readonly number[], a: Point, b: Point, others: readonly Route[], grid: GridLayout) {
  return candidates.find(
    (x) => !crowded(x, a[1], b[1], others) && !grid.nodes.some((n) => crosses(x, a[1], b[1], n.rect)),
  );
}

/**
 * A straight vertical package dependency moves aside: off a relation between classes of both packages that it
 * would cover, and to the right of the tab it would end on, into a free strip both frames still cover.
 */
export function clearPackageLines(
  routes: readonly Route[],
  relations: Relations,
  m: ClassModel,
  grid: GridLayout,
): Route[] {
  const out = [...routes];
  const move = (i: number, candidates: (lo: number, hi: number) => number[], when: (a: Point, b: Point) => boolean) => {
    const r = out[i] as Route;
    const v = vertical(r, relations[i], m, grid);
    if (!v || !when(v.a, v.b)) return;
    const others = out.filter((_, k) => k !== i);
    const lo = Math.max(v.ra.x, v.rb.x) + STEP / 2;
    const hi = Math.min(v.ra.x + v.ra.w, v.rb.x + v.rb.w) - STEP / 2;
    const x = freeX(candidates(lo, hi), v.a, v.b, others, grid);
    if (x !== undefined)
      out[i] = {
        ...r,
        points: [
          [x, v.a[1]],
          [x, v.b[1]],
        ],
      };
  };
  out.forEach((r, i) => {
    const others = () => out.filter((_, k) => k !== i);
    move(
      i,
      (lo, hi) =>
        [1, -1, 2, -2, 3, -3, 4, -4].map((k) => (r.points[0]?.[0] ?? 0) + k * STEP).filter((x) => x >= lo && x <= hi),
      (a, b) => crowded(a[0], a[1], b[1], others()),
    );
  });
  out.forEach((_, i) => {
    const rel = relations[i];
    const frame = rel && m.packages.has(rel.to) ? grid.groups.find((g) => g.id === rel.to) : undefined;
    const label = rel ? m.packages.get(rel.to)?.label : undefined;
    if (!frame || label === undefined) return;
    const tab = { x: frame.rect.x, y: frame.rect.y, w: Math.min(frame.rect.w, tabWidth(label)), h: CLASS.tabH };
    const steps = (_: number, hi: number) => {
      const xs: number[] = [];
      for (let x = tab.x + tab.w + STEP / 2; x <= hi; x += STEP / 2) xs.push(x);
      return xs;
    };
    move(i, steps, (a, b) => b[1] > a[1] && a[0] >= tab.x && a[0] <= tab.x + tab.w && b[1] === tab.y);
  });
  return out;
}
