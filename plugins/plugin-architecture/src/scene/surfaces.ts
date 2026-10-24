import type { Point, Rect, Shape, Tone } from '@diagrist/core';
import type { PlacedFrame } from '../layout/index.js';
import type { Look } from '../model/types.js';

/** A toned frame: labels and line halos on it take its tone instead of the canvas. */
export interface Surface {
  readonly rect: Rect;
  readonly tone: Tone;
}

/** Toned frames, outer first; in blocks frames are opaque areas and need none. */
export const surfacesOf = (frames: readonly PlacedFrame[], look: Look): Surface[] =>
  look === 'blocks' ? [] : frames.flatMap((f) => (f.group.tone ? [{ rect: f.rect, tone: f.group.tone }] : []));

/** The surfaces a point lies on, in drawing order. */
export const surfacesAt = (all: readonly Surface[], x: number, y: number): Surface[] =>
  all.filter(({ rect: r }) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);

/** The piece of a segment inside a rectangle (Liang-Barsky), or nothing. */
function clip(a: Point, b: Point, r: Rect): [Point, Point] | undefined {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let lo = 0;
  let hi = 1;
  const edges: [number, number][] = [
    [-dx, a[0] - r.x],
    [dx, r.x + r.w - a[0]],
    [-dy, a[1] - r.y],
    [dy, r.y + r.h - a[1]],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return undefined;
      continue;
    }
    const t = q / p;
    if (p < 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
  }
  if (lo >= hi) return undefined;
  return [
    [a[0] + lo * dx, a[1] + lo * dy],
    [a[0] + hi * dx, a[1] + hi * dy],
  ];
}

/** The pieces of a halo line that lie on surfaces, in their tone, to follow the halo itself. */
export function haloPieces(points: readonly Point[], under: readonly Surface[]): Shape[] {
  return under.flatMap((s) =>
    points.slice(1).flatMap((b, i): Shape[] => {
      const part = clip(points[i] as Point, b, s.rect);
      if (!part) return [];
      const [[x1, y1], [x2, y2]] = part;
      return [{ kind: 'path', d: `M${x1} ${y1} L${x2} ${y2}`, role: `edge-halo-${s.tone}` }];
    }),
  );
}
