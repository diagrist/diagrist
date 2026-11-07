import type { Rect } from '@diagrist/core';
import { bottom, cx, cy, right } from '../../geometry.js';
import { type Board, obstaclesFor } from '../boxes.js';
import type { Plan } from '../grid.js';
import { freeZigzag, type Lane } from '../shape.js';

const holds = (r: Rect, x: number, y: number): boolean => x >= r.x && x <= right(r) && y >= r.y && y <= bottom(r);

/** Whether a lane runs outside a frame that holds both boxes of a Z, so that its line leaves the frame for nothing. */
export function leaves(board: Board, p: Plan, lane: Lane): boolean {
  const [a, b] = [p.a.rect, p.b.rect];
  return board.layout.groups.some(
    (g) =>
      holds(g.rect, cx(a), cy(a)) &&
      holds(g.rect, cx(b), cy(b)) &&
      (lane.axis === 'col' ? !holds(g.rect, lane.at, g.rect.y) : !holds(g.rect, g.rect.x, lane.at)),
  );
}

const meets = (a: Rect, b: Rect): boolean => a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);
const within = (a: Rect, b: Rect): boolean =>
  a.x >= b.x && right(a) <= right(b) && a.y >= b.y && bottom(a) <= bottom(b);

/**
 * Whether every frame holding both boxes of a Z can grow around its lane beyond the grid (owner decision D1 of
 * 07.11.2026): the frame stretched to the lane and its pad meets no box and no frame that is neither inside it nor
 * around it. A frame holding one end only stays as it is, and the line runs outside it.
 */
export function grows(board: Board, p: Plan, lane: Lane): boolean {
  const [a, b] = [p.a.rect, p.b.rect];
  const pad = board.tree.spec.metrics.framePad;
  const groups = board.layout.groups.map((g) => g.rect);
  return groups.every((r) => {
    if (!holds(r, cx(a), cy(a)) || !holds(r, cx(b), cy(b))) return true;
    const x = Math.min(r.x, lane.at - pad.x);
    const y = Math.min(r.y, lane.at - pad.top);
    const grown: Rect =
      lane.axis === 'col'
        ? { ...r, x, w: Math.max(right(r), lane.at + pad.x) - x }
        : { ...r, y, h: Math.max(bottom(r), lane.at + pad.bottom) - y };
    const foreign = (o: Rect) => !within(o, r) && !within(r, o) && meets(o, grown);
    return !board.nodes.some((n) => foreign(n.rect)) && !groups.some((o) => o !== r && foreign(o));
  });
}

/**
 * An edge a grid lets leave the frame that holds both its ends, since the frame grows around it there
 * (`graph/grid-outside.ts`); only that round sets it.
 */
export type Leaving = Plan['edge'] & { readonly outside?: true };

/**
 * A Z between two boxes of one column or row whose gap lies outside a frame holding both boxes, such as the gap
 * right of the last column of a frame, takes the gap on the other side of the boxes where that lies inside and the Z
 * runs through nothing: its line and its text then stay in the frame. An edge marked `outside` keeps its gap.
 */
export function keepInside(board: Board, p: Plan): Plan {
  const lane = p.lane;
  if ((p.edge as Leaving).outside === true) return p;
  if (p.shape !== 'Z' || !lane || p.via || !leaves(board, p, lane)) return p;
  const same = lane.axis === 'col' ? p.a.colIndex === p.b.colIndex : p.a.rowIndex === p.b.rowIndex;
  if (!same) return p;
  const own = lane.axis === 'col' ? p.a.colIndex : p.a.rowIndex;
  const index = lane.index === own ? own - 1 : own;
  const gutters = lane.axis === 'col' ? board.layout.gutters.cols : board.layout.gutters.rows;
  const at = gutters[index];
  if (at === undefined) return p;
  const other: Lane = { axis: lane.axis, index, at, dir: lane.index === own ? -1 : 1 };
  if (leaves(board, p, other)) return p;
  const sides = freeZigzag(p.a, p.b, other, obstaclesFor(board, p.edge, true));
  return sides ? { ...p, fromSide: sides.fromSide, toSide: sides.toSide, lane: other } : p;
}
