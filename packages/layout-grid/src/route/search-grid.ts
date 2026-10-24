import type { Point, Rect } from '@diagrist/core';
import { bottom, right, segmentHitsRect } from '../geometry.js';
import { interference } from './cost.js';

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

/** A grid graph for the search; a key is a grid point times three plus the direction it was reached in. */
export interface SearchGrid {
  readonly source: number;
  readonly target: number;
  readonly point: (i: number) => Point;
  readonly neighbors: (key: number) => { readonly key: number; readonly cost: number }[];
}

/**
 * Steps cost their length, a bend twice the clearance, and crossing or running on a laid route a lot. Steps through
 * obstacles do not exist; with `avoidEdges` neither do steps onto laid routes.
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
  const edgeObstacles = avoidEdges
    ? used.flatMap((route) =>
        route.slice(1).map((p, i) => {
          const q = route[i] as Point;
          return {
            x: Math.min(p[0], q[0]) - 1,
            y: Math.min(p[1], q[1]) - 1,
            w: Math.abs(p[0] - q[0]) + 2,
            h: Math.abs(p[1] - q[1]) + 2,
          };
        }),
      )
    : [];
  const width = xs.length;
  const point = (i: number): Point => [xs[i % width] as number, ys[Math.floor(i / width)] as number];
  const at = (p: Point) => ys.indexOf(p[1]) * width + xs.indexOf(p[0]);
  const neighbors = (key: number) => {
    const index = Math.floor(key / 3);
    const x = index % width;
    const y = Math.floor(index / width);
    const candidates = [
      x > 0 ? index - 1 : -1,
      x + 1 < width ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y + 1 < ys.length ? index + width : -1,
    ];
    return candidates.flatMap((next) => {
      if (next < 0) return [];
      const a = point(index);
      const b = point(next);
      if (
        obstacles.some((r) => segmentHitsRect(a, b, r, gap / 2)) ||
        edgeObstacles.some((r) => segmentHitsRect(a, b, r, gap / 2 - 2))
      )
        return [];
      const dir = a[1] === b[1] ? 1 : 2;
      const turn = key % 3 && key % 3 !== dir ? gap * 2 : 0;
      return [
        { key: next * 3 + dir, cost: Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + turn + interference(a, b, used) },
      ];
    });
  };
  return { source: at(start) * 3, target: at(end), point, neighbors };
}
