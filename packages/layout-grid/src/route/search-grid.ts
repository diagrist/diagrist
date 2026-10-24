import type { Point, Rect } from '@diagrist/core';
import { bottom, right } from '../geometry.js';
import { interference } from './cost.js';
import { type Blocker, blockedSteps } from './search-steps.js';

const unique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);

/** Lines of the visibility grid: the ends, and half and full clearance around obstacles and laid routes. */
function axesOf(
  start: Point,
  end: Point,
  obstacles: readonly Rect[],
  used: readonly (readonly Point[])[],
  gap: number,
) {
  const xs = unique([
    start[0],
    end[0],
    ...obstacles.flatMap((r) => [r.x - gap, r.x - gap / 2, right(r) + gap / 2, right(r) + gap]),
    ...used.flatMap((p) => p.flatMap(([x]) => [x - gap, x - gap / 2, x + gap / 2, x + gap])),
  ]);
  const ys = unique([
    start[1],
    end[1],
    ...obstacles.flatMap((r) => [r.y - gap, r.y - gap / 2, bottom(r) + gap / 2, bottom(r) + gap]),
    ...used.flatMap((p) => p.flatMap(([, y]) => [y - gap, y - gap / 2, y + gap / 2, y + gap])),
  ]);
  return { xs, ys };
}

/**
 * A grid graph for the search. Points are numbered row by row; a key of the search is a point times three plus the
 * direction it was reached in (0 at the start, 1 horizontal, 2 vertical).
 */
export interface SearchGrid {
  readonly source: number;
  readonly target: number;
  /** Number of grid points; keys run below three times as many. */
  readonly size: number;
  /** What a bend costs on top of a step. */
  readonly bend: number;
  readonly point: (i: number) => Point;
  readonly steps: (point: number) => readonly Step[];
}

/** A step to a neighbouring grid point, with what it costs apart from a bend. */
export interface Step {
  readonly next: number;
  readonly dir: 1 | 2;
  readonly length: number;
  readonly penalty: number;
}

/** The laid routes as thin rectangles, each segment grown by a pixel. */
function routeRects(used: readonly (readonly Point[])[]): Rect[] {
  return used.flatMap((route) =>
    route.slice(1).map((p, i) => {
      const q = route[i] as Point;
      return {
        x: Math.min(p[0], q[0]) - 1,
        y: Math.min(p[1], q[1]) - 1,
        w: Math.abs(p[0] - q[0]) + 2,
        h: Math.abs(p[1] - q[1]) + 2,
      };
    }),
  );
}

/**
 * Steps cost their length, a bend twice the clearance, and crossing or running on a laid route a lot. Steps through
 * obstacles do not exist; with `avoidEdges` neither do steps onto laid routes. Which steps a grid line has, and what
 * they cost, is worked out once per line, point and step, when the search first reaches it; a step costs the same in
 * both directions.
 */
export function searchGrid(
  start: Point,
  end: Point,
  obstacles: readonly Rect[],
  used: readonly (readonly Point[])[],
  gap: number,
  avoidEdges: boolean,
): SearchGrid {
  const { xs, ys } = axesOf(start, end, obstacles, used, gap);
  const blockers: Blocker[] = [
    ...obstacles.map((rect) => ({ rect, pad: gap / 2 })),
    ...(avoidEdges ? routeRects(used).map((rect) => ({ rect, pad: gap / 2 - 2 })) : []),
  ];
  const width = xs.length;
  const rows: (Uint8Array | undefined)[] = [];
  const columns: (Uint8Array | undefined)[] = [];
  const row = (y: number) => (rows[y] ??= blockedSteps(xs, ys[y] as number, blockers, 'row'));
  const column = (x: number) => (columns[x] ??= blockedSteps(ys, xs[x] as number, blockers, 'column'));
  const point = (i: number): Point => [xs[i % width] as number, ys[Math.floor(i / width)] as number];
  const at = (p: Point) => ys.indexOf(p[1]) * width + xs.indexOf(p[0]);
  const size = width * ys.length;
  const penalties = new Float64Array(size * 2).fill(Number.NaN);
  const step = (index: number, next: number): Step => {
    const a = point(index);
    const b = point(next);
    const dir = a[1] === b[1] ? 1 : 2;
    const both = Math.min(index, next) * 2 + dir - 1;
    if (Number.isNaN(penalties[both])) penalties[both] = interference(a, b, used);
    return { next, dir, length: Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]), penalty: penalties[both] as number };
  };
  const stepsFrom = (index: number): Step[] => {
    const x = index % width;
    const y = Math.floor(index / width);
    const steps: Step[] = [];
    if (x > 0 && !row(y)[x - 1]) steps.push(step(index, index - 1));
    if (x + 1 < width && !row(y)[x]) steps.push(step(index, index + 1));
    if (y > 0 && !column(x)[y - 1]) steps.push(step(index, index - width));
    if (y + 1 < ys.length && !column(x)[y]) steps.push(step(index, index + width));
    return steps;
  };
  const steps: (Step[] | undefined)[] = [];
  return {
    source: at(start) * 3,
    target: at(end),
    size,
    bend: gap * 2,
    point,
    steps: (index) => (steps[index] ??= stepsFrom(index)),
  };
}
