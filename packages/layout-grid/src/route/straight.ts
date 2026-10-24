import type { Point, Rect } from '@diagrist/core';
import type { Side } from '../geometry.js';
import type { PlacedNode } from '../layout.js';
import type { GridNode } from '../spec.js';
import type { Board } from './boxes.js';
import type { Routed } from './routed.js';
import { ellipseIn } from './snap.js';

/** Where a ray from `o` inside the rectangle leaves it. */
function exitBox(o: Point, d: Point, r: Rect): Point {
  const along = (from: number, dir: number, lo: number, hi: number) =>
    dir > 0 ? (hi - from) / dir : dir < 0 ? (lo - from) / dir : Number.POSITIVE_INFINITY;
  const t = Math.max(0, Math.min(along(o[0], d[0], r.x, r.x + r.w), along(o[1], d[1], r.y, r.y + r.h)));
  return [o[0] + d[0] * t, o[1] + d[1] * t];
}

const centre = (r: Rect): Point => [r.x + r.w / 2, r.y + r.h / 2];

/**
 * The point on the outline in direction `d`: exactly on an ellipse, else `gap` outside the box. A line
 * leaving downwards runs on below the caption, so it does not strike through the name.
 */
function rim(p: PlacedNode, n: GridNode | undefined, d: Point, gap: number): Point {
  const o = centre(p.rect);
  if (n?.shape === 'ellipse') {
    const e = ellipseIn(p.rect);
    const t = 1 / Math.hypot(d[0] / e.rx, d[1] / e.ry);
    return [o[0] + d[0] * t, o[1] + d[1] * t];
  }
  let hit = exitBox(o, d, p.rect);
  const caption = n?.caption;
  const label = caption && { x: o[0] - caption.w / 2, y: p.rect.y + p.rect.h, w: caption.w, h: caption.below };
  const below = label && d[1] > 0 && Math.abs(hit[1] - (p.rect.y + p.rect.h)) < 0.01;
  if (below && hit[0] >= label.x && hit[0] <= label.x + label.w) hit = exitBox(hit, d, label);
  return [hit[0] + d[0] * gap, hit[1] + d[1] * gap];
}

const round = (p: Point): Point => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10];

function sides(d: Point): { fromSide: Side; toSide: Side } {
  if (Math.abs(d[0]) >= Math.abs(d[1]))
    return d[0] >= 0 ? { fromSide: 'right', toSide: 'left' } : { fromSide: 'left', toSide: 'right' };
  return d[1] >= 0 ? { fromSide: 'bottom', toSide: 'top' } : { fromSide: 'top', toSide: 'bottom' };
}

/**
 * Straight lines from outline to outline on the line between the centres, rounded to a tenth. Edges between frames
 * or of a node with itself have no straight line and are left out. Avoiding things is the placement's job.
 */
export function straightRoutes(board: Board): Routed[] {
  const gap = board.tree.spec.metrics.endGap ?? 0;
  return board.tree.spec.edges.flatMap((edge): Routed[] => {
    const a = board.placed(edge.from);
    const b = board.placed(edge.to);
    if (!a || !b || a === b) return [];
    const [ax, ay] = centre(a.rect);
    const [bx, by] = centre(b.rect);
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const d: Point = [(bx - ax) / len, (by - ay) / len];
    const back: Point = [-d[0], -d[1]];
    const box = (p: PlacedNode) => ({ id: p.id, rect: p.rect, colIndex: p.col, rowIndex: p.row });
    return [
      {
        edge,
        from: box(a),
        to: box(b),
        shape: 'straight',
        points: [round(rim(a, board.node(a.id), d, gap)), round(rim(b, board.node(b.id), back, gap))],
        ...sides(d),
      },
    ];
  });
}
