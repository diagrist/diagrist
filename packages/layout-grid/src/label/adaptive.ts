import type { Point, Rect } from '@diagrist/core';
import { overlaps, segmentHitsRect, union } from '../geometry.js';
import type { Route } from '../layout.js';
import { memberBounds } from '../place/frames.js';
import { type Board, headStrips } from '../route/boxes.js';
import type { EdgeLabel } from './types.js';

function moved(items: readonly EdgeLabel[], dx: number, dy: number): EdgeLabel[] {
  return items.map((item) => ({
    ...item,
    x: item.x + dx,
    y: item.y + dy,
    box: { ...item.box, x: item.box.x + dx, y: item.box.y + dy },
  }));
}

/** Left, right and bottom line of a frame, as rectangles without area. */
const sides = (r: Rect): Rect[] => [
  { x: r.x, y: r.y, w: 0, h: r.h },
  { x: r.x + r.w, y: r.y, w: 0, h: r.h },
  { x: r.x, y: r.y + r.h, w: r.w, h: 0 },
];

/** Places on a segment, the middle first; the fine eighths help where many frame heads crowd. */
const FRACTIONS = [0.5, 0.25, 0.75, 0.375, 0.625, 0.125, 0.875];

/**
 * Labels of an adaptive grid move as one block per route: over the segments from the longest, the places in
 * `FRACTIONS`, both sides, the first spot clear of nodes, head strips, sides of passable frames, `fixed` texts,
 * routes and labels placed before. Without one they stay where they are.
 */
export function adaptiveLabels(
  board: Board,
  texts: readonly EdgeLabel[],
  routes: readonly Route[],
  fixed: readonly EdgeLabel[],
): EdgeLabel[] {
  const m = board.tree.spec.metrics;
  const blocked: Rect[] = board.layout.nodes.map((n) => memberBounds(n, board.node(n.id)));
  blocked.push(...fixed.map((f) => f.box));
  blocked.push(...headStrips(board.layout.groups, m.framePad.top));
  blocked.push(...board.layout.groups.filter((g) => board.tree.group(g.id)?.passable).flatMap((g) => sides(g.rect)));
  const placed: EdgeLabel[] = [];
  const clear = (rect: Rect) =>
    !blocked.some((b) => overlaps(rect, b, 4)) &&
    !placed.some((p) => overlaps(rect, p.box, 4)) &&
    !routes.some((r) => r.points.slice(1).some((p, i) => segmentHitsRect(r.points[i] as Point, p, rect, 3)));
  routes.forEach((r, route) => {
    const items = texts.filter((t) => t.route === route);
    if (!items.length) return;
    const bounds = union(items.map((i) => i.box));
    const segments = r.points
      .slice(1)
      .map((b, i) => {
        const a = r.points[i] as Point;
        return { a, b, len: Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) };
      })
      .sort((a, b) => b.len - a.len);
    for (const { a, b, len } of segments) {
      const horizontal = a[1] === b[1];
      if (len < (horizontal ? bounds.w : bounds.h) + 16) continue;
      for (const fraction of FRACTIONS)
        for (const side of [-1, 1]) {
          const x = a[0] + (b[0] - a[0]) * fraction;
          const y = a[1] + (b[1] - a[1]) * fraction;
          const rect = {
            ...bounds,
            x: horizontal ? x - bounds.w / 2 : x + (side < 0 ? -bounds.w - m.labelGap : m.labelGap),
            y: horizontal ? y + (side < 0 ? -bounds.h - m.labelGap : m.labelGap) : y - bounds.h / 2,
          };
          if (clear(rect)) {
            placed.push(...moved(items, rect.x - bounds.x, rect.y - bounds.y));
            return;
          }
        }
    }
    placed.push(...items);
  });
  return placed;
}
