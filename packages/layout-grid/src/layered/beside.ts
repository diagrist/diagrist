import type { Point, Rect } from '@diagrist/core';
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
  route(e: LayeredEdge, frame: Frame, tracks: readonly number[], taken?: Taken): Route | undefined;
}

/** The places on the bottom side of each box that other lines already take, and the least gap between two. */
export interface Taken {
  readonly at: Map<string, number[]>;
  readonly gap: number;
}

/**
 * Where a line leaves the bottom of `r` toward `other`: the middle while no other line takes the side, else the
 * place nearest the corner toward the other end that is a port gap clear of the places taken, so the line passes
 * outside the lines that go down from the side and the first such line keeps the outermost place and the highest
 * track. The place is taken from then on.
 */
function bottomPort(box: string, r: Rect, other: number, taken: Taken | undefined): number {
  const mid = Math.round(r.x + r.w / 2);
  if (taken === undefined) return mid;
  const used = taken.at.get(box) ?? [];
  const inset = Math.min(16, r.w / 4);
  const toward = other >= mid ? 1 : -1;
  const outer = toward > 0 ? r.x + r.w - inset : r.x + inset;
  const steps = Math.floor((r.w - 2 * inset) / taken.gap);
  const clear = (v: number) => used.every((u) => Math.abs(u - v) >= taken.gap);
  const at =
    used.length === 0
      ? mid
      : (Array.from({ length: steps + 1 }, (_, k) => Math.round(outer - toward * k * taken.gap)).find(clear) ?? mid);
  taken.at.set(box, [...used, at]);
  return at;
}

/**
 * Edges beside each other: between neighbours, with nothing but placeholders between them, a horizontal line
 * between the facing sides at the middle both boxes share, several between the same two boxes two tracks apart
 * around it; otherwise down out of the first box, along a track of
 * its own below the other tracks of the gap, and up into the second box, each end clear of the ports other
 * lines take on that side.
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
  return {
    count: (l) => under.filter((e) => layerOf(e) === l).length,
    route: (e, frame, tracks, taken) => {
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
        const xa = bottomPort(e.from, a, b.x + b.w / 2, taken);
        const xb = bottomPort(e.to, b, a.x + a.w / 2, taken);
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
