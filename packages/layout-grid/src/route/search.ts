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
  const { source, target, point } = graph;
  const distance = new Map<number, number>([[source, 0]]);
  const previous = new Map<number, number>();
  const queue = new MinQueue();
  queue.push(source, 0);
  let current = queue.pop();
  while (current) {
    const { key, cost } = current;
    if (Math.floor(key / 3) === target) {
      const path: Point[] = [];
      let cursor: number | undefined = key;
      while (cursor !== undefined) {
        path.push(point(Math.floor(cursor / 3)));
        cursor = previous.get(cursor);
      }
      return simplify(path.reverse());
    }
    if (distance.get(key) === cost) {
      for (const next of graph.neighbors(key)) {
        const nextCost = cost + next.cost;
        if (nextCost >= (distance.get(next.key) ?? Infinity)) continue;
        distance.set(next.key, nextCost);
        previous.set(next.key, key);
        queue.push(next.key, nextCost);
      }
    }
    current = queue.pop();
  }
  return undefined;
}
