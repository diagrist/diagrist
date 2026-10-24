import { type Point, type Rect, textWidth } from '@diagrist/core';
import { type EdgeLabel, type GridLayout, overlaps, type Route } from '@diagrist/layout-grid';
import type { ClassRelation } from '../diagram.js';
import { crossEnds, HEAD_AT_END, HEAD_AT_START, headLength } from './heads.js';
import { CLASS, CLASS_FONTS as F } from './metrics.js';

/** When the place right at the end is taken, the text moves along the line by these. */
const SHIFTS = [0, 16, 32, 48];

interface End {
  readonly tip: Point;
  readonly next: Point;
  /** Multiplicity and role of this end. */
  readonly texts: readonly [string | undefined, string | undefined];
  readonly back: number;
}

function endsOf(r: ClassRelation, points: readonly Point[]): End[] {
  const x = crossEnds(r);
  const cross = (on: boolean) => (on ? CLASS.crossAt + CLASS.crossArm : 0);
  const at = (i: number) => points.at(i) ?? [0, 0];
  return [
    {
      tip: at(-1),
      next: at(-2),
      texts: [r.card, r.role],
      back: headLength(HEAD_AT_END[r.kind]) + cross(x.end) + CLASS.endGap,
    },
    {
      tip: at(0),
      next: at(1),
      texts: [r.source, r.srole],
      back: headLength(HEAD_AT_START[r.kind]) + cross(x.start) + CLASS.endGap,
    },
  ];
}

/**
 * A text beside the end of a line, behind its symbol. Side +1: below a horizontal and right of a vertical line (the
 * place of the multiplicity); -1 opposite (the place of the role).
 */
function item(text: string, end: End, side: 1 | -1, route: number, shift: number): EdgeLabel {
  const size = F.label.size;
  const back = end.back + shift;
  const w = textWidth(text, F.label);
  const dx = Math.sign(end.next[0] - end.tip[0]);
  const dy = Math.sign(end.next[1] - end.tip[1]);
  const horizontal = dy === 0;
  const anchor = horizontal ? (dx > 0 ? 'start' : 'end') : side > 0 ? 'start' : 'end';
  const x = horizontal ? end.tip[0] + dx * back : end.tip[0] + side * CLASS.endAside;
  const y = horizontal
    ? end.tip[1] + (side > 0 ? CLASS.endAside + size - 1 : -CLASS.endAside - 2)
    : end.tip[1] + (dy > 0 ? back + size - 1 : -back - 2);
  const left = anchor === 'start' ? x : x - w;
  return { text, x, y, anchor, box: { x: left, y: y - size + 1, w, h: size + 2 }, route, part: 'mark' };
}

const within = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/** Does the text lie on the line of a frame, half in and half out? */
const onFrame = (b: Rect, frame: Rect) => overlaps(b, frame, 0) && !within(b, frame);

/** Does the bounding box of a segment reach into the rectangle widened by `pad`? */
const hits = (p: Point, q: Point, r: Rect, pad: number) =>
  Math.min(p[0], q[0]) < r.x + r.w + pad &&
  Math.max(p[0], q[0]) > r.x - pad &&
  Math.min(p[1], q[1]) < r.y + r.h + pad &&
  Math.max(p[1], q[1]) > r.y - pad;

/**
 * Multiplicities and roles at both ends of every relation. The multiplicity stands below or right of the line, the
 * role opposite; when the place is taken by a box, a text, a line or the border of a package, both swap sides, and
 * then they move along the line.
 */
export function endLabels(
  relations: readonly (ClassRelation | undefined)[],
  routes: readonly Route[],
  grid: GridLayout,
  placed: readonly EdgeLabel[],
): EdgeLabel[] {
  const out: EdgeLabel[] = [];
  const boxes = grid.nodes.map((n) => n.rect);
  const free = (b: Rect) =>
    !boxes.some((n) => overlaps(b, n, 1)) &&
    !grid.groups.some((g) => onFrame(b, g.rect)) &&
    ![...placed, ...out].some((t) => overlaps(b, t.box, 2)) &&
    !routes.some((o) => o.points.slice(1).some((q, k) => hits(o.points[k] ?? q, q, b, 1)));
  routes.forEach((route, idx) => {
    const r = relations[idx];
    if (!r || route.points.length < 2) return;
    for (const end of endsOf(r, route.points)) {
      const [count, role] = end.texts;
      const sides: (1 | -1)[] = count ? [1, -1] : [-1, 1];
      const first = count ?? role;
      if (first === undefined) continue;
      const side = sides.find((s) => free(item(first, end, s, idx, 0).box)) ?? 1;
      const place = (text: string, s: 1 | -1) =>
        SHIFTS.map((k) => item(text, end, s, idx, k)).find((t) => free(t.box)) ?? item(text, end, s, idx, 0);
      if (count) out.push(place(count, side));
      if (role) out.push(place(role, count ? (side === 1 ? -1 : 1) : side));
    }
  });
  return out;
}
