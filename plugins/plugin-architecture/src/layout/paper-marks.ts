import type { Point, Rect } from '@diagrist/core';
import type { EdgeLabel, Route } from '@diagrist/layout-grid';
import type { ArchNode } from '../model/types.js';
import type { Badge, Mark } from './marks.js';

/** Radius of a flow number on paper and the room it keeps from the texts on its line. */
const R = 7.5;
const ROOM = 6;

const union = (boxes: readonly Rect[]): Rect => {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
};

const near = (b: Badge, r: Rect): boolean =>
  b.x + R + ROOM > r.x && b.x - R - ROOM < r.x + r.w && b.y + R + ROOM > r.y && b.y - R - ROOM < r.y + r.h;

/** The segment of `points` that `b` lies on. */
function segmentOf(points: readonly Point[], b: Badge): readonly [Point, Point] | undefined {
  for (let i = 0; i < points.length - 1; i++) {
    const [a, c] = [points[i] as Point, points[i + 1] as Point];
    const within = (v: number, p: number, q: number) => v >= Math.min(p, q) && v <= Math.max(p, q);
    if (within(b.x, a[0], c[0]) && within(b.y, a[1], c[1])) return [a, c];
  }
  return undefined;
}

const moved = (l: EdgeLabel, along: 0 | 1, by: number): EdgeLabel =>
  along === 0
    ? { ...l, x: l.x + by, box: { ...l.box, x: l.box.x + by } }
    : { ...l, y: l.y + by, box: { ...l.box, y: l.box.y + by } };

/**
 * Flow numbers that would sit under the texts standing on their line move along their segment to the side of the
 * texts that faces the start, else to the other side. Where neither stays on the segment, the number goes to its
 * start and the texts move up behind it.
 */
export function seatBadges(
  badges: readonly Badge[],
  labels: readonly EdgeLabel[],
  routes: readonly Route[],
): { badges: Badge[]; labels: EdgeLabel[] } {
  let out = [...labels];
  const seated = badges.map((b) => {
    const own = out.filter((l) => l.route === b.route);
    const segment = segmentOf(routes[b.route]?.points ?? [], b);
    if (own.length === 0 || !segment || !near(b, union(own.map((l) => l.box)))) return b;
    const box = union(own.map((l) => l.box));
    const [a, c] = segment;
    const along = a[1] === c[1] ? 0 : 1;
    const sign = Math.sign(c[along] - a[along]);
    const low = along === 0 ? box.x : box.y;
    const high = low + (along === 0 ? box.w : box.h);
    const before = sign > 0 ? low - ROOM - R : high + ROOM + R;
    const after = sign > 0 ? high + ROOM + R : low - ROOM - R;
    const fits = (v: number) => (v - a[along] - R) * sign >= 0 && (c[along] - v - 2 * R) * sign >= 0;
    const spot = [before, after].find(fits);
    const at = spot ?? a[along] + sign * (R + 2);
    if (spot === undefined) {
      const by = at + sign * (R + ROOM) - (sign > 0 ? low : high);
      out = out.map((l) => (l.route === b.route ? moved(l, along, by) : l));
    }
    return along === 0 ? { ...b, x: at } : { ...b, y: at };
  });
  return { badges: seated, labels: out };
}

/** Where a decision mark stands inside the top right corner of its node, left of a replica tag. */
const CORNER = { dx: 20, dy: 13, replicas: 30 } as const;

/**
 * Decision marks at nodes move into the top right corner of their box, where the width of the box keeps room for
 * them, so they never meet a line or a text outside; marks at edges stay.
 */
export function marksInside(
  marks: readonly Mark[],
  nodes: readonly ArchNode[],
  rects: ReadonlyMap<string, Rect>,
): Mark[] {
  return marks.map((mark) => {
    if (mark.route !== undefined) return mark;
    const node = nodes.find((n) => n.mark === mark.id && rects.has(n.id));
    const r = node && rects.get(node.id);
    if (!node || !r) return mark;
    const shift = node.replicas !== undefined || node.shape === 'job' ? CORNER.replicas : 0;
    return { ...mark, x: r.x + r.w - CORNER.dx - shift, y: r.y + CORNER.dy };
  });
}
