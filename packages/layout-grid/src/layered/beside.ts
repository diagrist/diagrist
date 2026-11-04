import type { Point } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { Route } from '../layout.js';
import type { Frame } from './geometry.js';
import type { Ranked } from './rank.js';
import type { LayeredEdge } from './spec.js';

/** The side a route leaves its first box by, or reaches its last box by, from its first or last piece. */
export function sideOf(points: readonly Point[], end: 'from' | 'to'): Side {
  const [a, b] = end === 'from' ? [points[0], points[1]] : [points.at(-2), points.at(-1)];
  if (!a || !b) return 'bottom';
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (end === 'from') return dy > 0 ? 'bottom' : dy < 0 ? 'top' : dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'top' : dy < 0 ? 'bottom' : dx > 0 ? 'left' : 'right';
}

/** Edges between two boxes of one layer: how many run below their layer, and the route of each. */
export interface Beside {
  /** Tracks the edges that run below layer `l` add to the gap below it. */
  count(l: number): number;
  route(e: LayeredEdge, frame: Frame, tracks: readonly number[]): Route | undefined;
}

/**
 * Edges beside each other: between neighbours, with nothing but placeholders between them, a horizontal line
 * between the facing sides at the middle both boxes share; otherwise down out of the first box, along a track of
 * its own below the other tracks of the gap, and up into the second box.
 */
export function besideRoutes(ranked: Ranked, layers: readonly (readonly string[])[]): Beside {
  const layerOf = (e: LayeredEdge) => ranked.layerOf.get(e.from) ?? 0;
  const neighbours = (e: LayeredEdge) => {
    const layer = layers[layerOf(e)] ?? [];
    const [i, j] = [layer.indexOf(e.from), layer.indexOf(e.to)].sort((a, b) => a - b) as [number, number];
    return layer.slice(i + 1, j).every((n) => ranked.dummies.has(n));
  };
  const under = ranked.beside.filter((e) => e.hidden !== true && !neighbours(e));
  return {
    count: (l) => under.filter((e) => layerOf(e) === l).length,
    route: (e, frame, tracks) => {
      const a = frame.rects.get(e.from);
      const b = frame.rects.get(e.to);
      if (!a || !b) return undefined;
      const l = layerOf(e);
      let points: Point[];
      if (neighbours(e)) {
        const y = Math.round((Math.max(a.y, b.y) + Math.min(a.y + a.h, b.y + b.h)) / 2);
        points =
          a.x < b.x
            ? [
                [a.x + a.w, y],
                [b.x, y],
              ]
            : [
                [a.x, y],
                [b.x + b.w, y],
              ];
      } else {
        const k = under.filter((u) => layerOf(u) === l).indexOf(e);
        const ty = (frame.gapTop[l] ?? 0) + (frame.first[l] ?? 0) + ((tracks[l] ?? 0) + k) * frame.track;
        const xa = Math.round(a.x + a.w / 2);
        const xb = Math.round(b.x + b.w / 2);
        points = [
          [xa, a.y + a.h],
          [xa, ty],
          [xb, ty],
          [xb, b.y + b.h],
        ];
      }
      return {
        edge: e.id,
        points,
        shape: 'orthogonal',
        fromSide: sideOf(points, 'from'),
        toSide: sideOf(points, 'to'),
      };
    },
  };
}
