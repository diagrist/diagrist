import type { Point, Rect } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { Route } from '../layout.js';
import type { Frame } from './geometry.js';
import type { Link } from './links.js';
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
  /** The ends of the edges that run below, one per box, for the ports to place with the others of its bottom. */
  readonly ends: readonly Link[];
  /** The route of an edge, its ends below at the places `ports` gave them, else at the middle of each box. */
  route(e: LayeredEdge, frame: Frame, tracks: readonly number[], ports?: ReadonlyMap<Link, number>): Route | undefined;
}

/**
 * Edges beside each other: between neighbours, with nothing but placeholders between them, a horizontal line
 * between the facing sides at the middle both boxes share, several between the same two boxes two tracks apart
 * around it; otherwise down out of the first box, along a track of
 * its own below the other tracks of the gap, and up into the second box, each end at the port it took among the
 * others of its side.
 */
export function besideRoutes(ranked: Ranked, layers: readonly (readonly string[])[]): Beside {
  const layerOf = (e: LayeredEdge) => ranked.layerOf.get(e.from) ?? 0;
  const neighbours = (e: LayeredEdge) => {
    const layer = layers[layerOf(e)] ?? [];
    const [i, j] = [layer.indexOf(e.from), layer.indexOf(e.to)].sort((a, b) => a - b) as [number, number];
    return layer.slice(i + 1, j).every((n) => ranked.dummies.has(n));
  };
  const pair = (e: LayeredEdge) => [e.from, e.to].sort().join('\u0000');
  const under = ranked.beside.filter((e) => e.hidden !== true && !neighbours(e));
  const ends = under.flatMap((e): Link[] => [
    { edge: `${e.id}:from`, upper: e.from, lower: e.to, gap: layerOf(e) },
    { edge: `${e.id}:to`, upper: e.to, lower: e.from, gap: layerOf(e) },
  ]);
  const portOf = (id: string, r: Rect, ports: ReadonlyMap<Link, number> | undefined) => {
    const end = ends.find((l) => l.edge === id);
    return (end && ports?.get(end)) ?? Math.round(r.x + r.w / 2);
  };
  return {
    count: (l) => under.filter((e) => layerOf(e) === l).length,
    ends,
    route: (e, frame, tracks, ports) => {
      const a = frame.rects.get(e.from);
      const b = frame.rects.get(e.to);
      if (!a || !b) return undefined;
      const l = layerOf(e);
      let points: Point[];
      if (neighbours(e)) {
        const twins = ranked.beside.filter((u) => u.hidden !== true && pair(u) === pair(e) && neighbours(u));
        const [top, bottom] = [Math.max(a.y, b.y), Math.min(a.y + a.h, b.y + b.h)];
        const apart = twins.length < 2 ? 0 : Math.min(2 * frame.track, (bottom - top) / (twins.length + 1));
        const y = Math.round((top + bottom) / 2 + (twins.indexOf(e) - (twins.length - 1) / 2) * apart);
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
        const xa = portOf(`${e.id}:from`, a, ports);
        const xb = portOf(`${e.id}:to`, b, ports);
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
