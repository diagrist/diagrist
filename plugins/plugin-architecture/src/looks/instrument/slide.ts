import type { Point, Rect } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import type { Tag } from './tags.js';

/** What a tag on a line must not meet: boxes, the frames whose border it must not straddle, their title bars. */
export interface Ground {
  readonly boxes: readonly Rect[];
  readonly frames: readonly Rect[];
  readonly bars: readonly Rect[];
}

/** Steps of a slide, the room kept from the ends of a segment and the room around borders. */
const STEP = 2;
const END = 1;
const ROOM = 3;

const meets = (a: Rect, b: Rect, pad = 0): boolean =>
  a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad;
const inside = (a: Rect, b: Rect): boolean =>
  a.x >= b.x + ROOM && a.y >= b.y + ROOM && a.x + a.w <= b.x + b.w - ROOM && a.y + a.h <= b.y + b.h - ROOM;
const middle = (r: Rect): Point => [r.x + r.w / 2, r.y + r.h / 2];

/** The segment of a route the middle of `r` lies on, and its axis: 0 horizontal, 1 vertical. */
function segmentOf(route: Route, r: Rect): { a: Point; b: Point; axis: 0 | 1 } | undefined {
  const [x, y] = middle(r);
  const on = (v: number, p: number, q: number) => v >= Math.min(p, q) - 1 && v <= Math.max(p, q) + 1;
  for (let i = 0; i < route.points.length - 1; i++) {
    const [a, b] = [route.points[i] as Point, route.points[i + 1] as Point];
    if (a[1] === b[1] && Math.abs(y - a[1]) <= 1 && on(x, a[0], b[0])) return { a, b, axis: 0 };
    if (a[0] === b[0] && Math.abs(x - a[0]) <= 1 && on(y, a[1], b[1])) return { a, b, axis: 1 };
  }
  return undefined;
}

const shifted = (t: Tag, axis: 0 | 1, by: number): Tag => ({
  ...t,
  rect: axis === 0 ? { ...t.rect, x: t.rect.x + by } : { ...t.rect, y: t.rect.y + by },
  lines: t.lines.map((l) => (axis === 0 ? { ...l, x: l.x + by } : { ...l, y: l.y + by })),
});

/** Does a tag meet a box, straddle a frame's border, cover a title bar, or leave its segment? */
function blocked(t: Tag, ground: Ground, ends: readonly [number, number], axis: 0 | 1): boolean {
  const low = axis === 0 ? t.rect.x : t.rect.y;
  const high = low + (axis === 0 ? t.rect.w : t.rect.h);
  if (low < ends[0] + END || high > ends[1] - END) return true;
  return (
    ground.boxes.some((b) => meets(t.rect, b, ROOM)) ||
    ground.bars.some((b) => meets(t.rect, b, ROOM)) ||
    ground.frames.some((f) => meets(t.rect, f, ROOM) && !inside(t.rect, f))
  );
}

/**
 * Tags on lines that meet a box, straddle the border of a frame or cover its bar slide along their segment by the
 * smallest distance that clears them, and wrap their name where no distance does; the layout of `layout-grid`
 * centred them without knowing the frames' borders, and a tag is wider than the text it was measured for.
 */
export function slideTags(
  labels: readonly Tag[],
  routes: readonly Route[],
  ground: Ground,
  narrow: (t: Tag) => Tag | undefined,
): Tag[] {
  const seat = (t: Tag): Tag | undefined => {
    const route = routes[t.route ?? -1];
    const seg = route && segmentOf(route, t.rect);
    if (!seg) return t;
    const { a, b, axis } = seg;
    const ends = [Math.min(a[axis], b[axis]), Math.max(a[axis], b[axis])] as const;
    const steps = Array.from({ length: Math.floor((ends[1] - ends[0]) / STEP) }, (_, k) => [
      (k + 1) * STEP,
      -(k + 1) * STEP,
    ]);
    const by = [0, ...steps.flat()].find((d) => !blocked(shifted(t, axis, d), ground, ends, axis));
    return by === undefined ? undefined : shifted(t, axis, by);
  };
  return labels.map((t) => {
    const narrower = seat(t) ? undefined : narrow(t);
    return seat(t) ?? (narrower && seat(narrower)) ?? t;
  });
}
