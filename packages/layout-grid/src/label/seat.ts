import type { Point, Rect } from '@diagrist/core';
import { union } from '../geometry.js';
import type { Route } from '../layout.js';
import type { EdgeLabel } from './types.js';

/** A round mark on a route, such as the number of a step, centred on (x, y). */
export interface SeatMark {
  /** Index of the route it stands on. */
  readonly route: number;
  readonly x: number;
  readonly y: number;
}

/** The size of the marks and the room they keep. */
export interface SeatOptions {
  /** Radius of every mark. */
  readonly r: number;
  /** Room a mark keeps from the texts on its line, beyond its radius. */
  readonly room: number;
}

/** The segment of `points` that the mark lies on. */
function segmentOf(points: readonly Point[], m: SeatMark): readonly [Point, Point] | undefined {
  for (let i = 0; i < points.length - 1; i++) {
    const [a, c] = [points[i] as Point, points[i + 1] as Point];
    const within = (v: number, p: number, q: number) => v >= Math.min(p, q) && v <= Math.max(p, q);
    if (within(m.x, a[0], c[0]) && within(m.y, a[1], c[1])) return [a, c];
  }
  return undefined;
}

const moved = (l: EdgeLabel, along: 0 | 1, by: number): EdgeLabel =>
  along === 0
    ? { ...l, x: l.x + by, box: { ...l.box, x: l.box.x + by } }
    : { ...l, y: l.y + by, box: { ...l.box, y: l.box.y + by } };

/**
 * Marks that would sit under the texts standing on their line move along their segment, to the side of the texts
 * that faces the start of the segment, else to the other side. A spot counts when the mark keeps its radius from the
 * start and twice that from the end, which the arrowhead takes, whichever way the segment runs. Where neither side
 * holds, the mark goes next to the start and the texts move behind it. Other fields of a mark are kept.
 */
export function seatMarks<M extends SeatMark>(
  marks: readonly M[],
  labels: readonly EdgeLabel[],
  routes: readonly Route[],
  { r: R, room: ROOM }: SeatOptions,
): { marks: M[]; labels: EdgeLabel[] } {
  const near = (m: SeatMark, r: Rect): boolean =>
    m.x + R + ROOM > r.x && m.x - R - ROOM < r.x + r.w && m.y + R + ROOM > r.y && m.y - R - ROOM < r.y + r.h;
  let out = [...labels];
  const seated = marks.map((m) => {
    const own = out.filter((l) => l.route === m.route);
    const segment = segmentOf(routes[m.route]?.points ?? [], m);
    if (own.length === 0 || !segment || !near(m, union(own.map((l) => l.box)))) return m;
    const box = union(own.map((l) => l.box));
    const [a, c] = segment;
    const along = a[1] === c[1] ? 0 : 1;
    const sign = Math.sign(c[along] - a[along]);
    const low = along === 0 ? box.x : box.y;
    const high = low + (along === 0 ? box.w : box.h);
    const before = sign > 0 ? low - ROOM - R : high + ROOM + R;
    const after = sign > 0 ? high + ROOM + R : low - ROOM - R;
    const fits = (v: number) => (v - a[along]) * sign - R >= 0 && (c[along] - v) * sign - 2 * R >= 0;
    const spot = [before, after].find(fits);
    const at = spot ?? a[along] + sign * (R + 2);
    if (spot === undefined) {
      const by = at + sign * (R + ROOM) - (sign > 0 ? low : high);
      out = out.map((l) => (l.route === m.route ? moved(l, along, by) : l));
    }
    return along === 0 ? { ...m, x: at } : { ...m, y: at };
  });
  return { marks: seated, labels: out };
}
