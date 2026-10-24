import type { Point, Rect } from '@diagrist/core';
import { MinQueue } from './heap.js';
import { type SearchGrid, searchGrid } from './search-grid.js';

/** Drops repeated points and middle points of straight runs, but keeps a turn back. */
export function simplify(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const b = out.at(-1);
    if (b && b[0] === p[0] && b[1] === p[1]) continue;
    const a = out.at(-2);
    if (
      a &&
      b &&
      ((a[0] === b[0] && b[0] === p[0]) || (a[1] === b[1] && b[1] === p[1])) &&
      (b[0] - a[0]) * (p[0] - b[0]) >= 0 &&
      (b[1] - a[1]) * (p[1] - b[1]) >= 0
    )
      out.pop();
    out.push(p);
  }
  return out;
}

/**
 * The cheapest orthogonal path from `start` to `end` around obstacles (Dijkstra on a visibility grid, counting
 * length, bends and laid routes). If laid routes close every way, it searches once more across them.
 */
export function searchPath(
  start: Point,
  end: Point,
  obstacles: readonly Rect[],
  used: readonly (readonly Point[])[],
  gap: number,
  avoidEdges = true,
): Point[] | undefined {
  const path = shortest(searchGrid(start, end, obstacles, used, gap, avoidEdges));
  return path ? simplify(path) : avoidEdges ? searchPath(start, end, obstacles, used, gap, false) : undefined;
}

function shortest(graph: SearchGrid): Point[] | undefined {
  const { source, target, point, size, bend } = graph;
  const distance = new Float64Array(size * 3).fill(Number.POSITIVE_INFINITY);
  const previous = new Int32Array(size * 3).fill(-1);
  distance[source] = 0;
  const queue = new MinQueue();
  queue.push(source, 0);
  let current = queue.pop();
  while (current) {
    const { key, cost } = current;
    if (Math.floor(key / 3) === target) {
      const path: Point[] = [];
      for (let cursor = key; cursor >= 0; cursor = previous[cursor] as number) path.push(point(Math.floor(cursor / 3)));
      return simplify(path.reverse());
    }
    if (distance[key] === cost) {
      const from = key % 3;
      for (const { next, dir, length, penalty } of graph.steps(Math.floor(key / 3))) {
        const nextKey = next * 3 + dir;
        const nextCost = cost + (length + (from && from !== dir ? bend : 0) + penalty);
        if (nextCost >= (distance[nextKey] as number)) continue;
        distance[nextKey] = nextCost;
        previous[nextKey] = key;
        queue.push(nextKey, nextCost);
      }
    }
    current = queue.pop();
  }
  return undefined;
}
