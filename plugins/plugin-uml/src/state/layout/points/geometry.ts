import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, cy, type GridLayout, right, type Side } from '@diagrist/layout-grid';
import { isBorderPoint, type StateModel } from '../../model.js';

/** Does the bounding box of a segment reach into the rectangle widened by `pad`? */
export const segmentHits = (p: Point, q: Point, r: Rect, pad = 0): boolean =>
  Math.min(p[0], q[0]) < right(r) + pad &&
  Math.max(p[0], q[0]) > r.x - pad &&
  Math.min(p[1], q[1]) < bottom(r) + pad &&
  Math.max(p[1], q[1]) > r.y - pad;

/** The composite state an entry or exit point sits on the frame of; undefined on a simple or submachine state. */
export function borderOf(m: StateModel, id: string): string | undefined {
  const v = m.vertices.get(id);
  return v && isBorderPoint(v.kind) && v.parent !== undefined && m.composites.has(v.parent) ? v.parent : undefined;
}

/** The simple or submachine state an entry or exit point sits on the box of. */
export function hostOf(m: StateModel, id: string): string | undefined {
  const v = m.vertices.get(id);
  const owner = v?.parent === undefined ? undefined : m.vertices.get(v.parent);
  return v && isBorderPoint(v.kind) && owner?.kind === 'state' && !m.composites.has(owner.id) ? owner.id : undefined;
}

/** The rectangle an entry or exit point sits on: the frame of its composite state or the box of its state. */
export function pointFrame(m: StateModel, id: string, grid: GridLayout): Rect | undefined {
  const border = borderOf(m, id);
  if (border) return grid.groups.find((g) => g.id === border)?.rect;
  const host = hostOf(m, id);
  return host ? grid.nodes.find((n) => n.id === host)?.rect : undefined;
}

/** The side of its frame an entry or exit point sits on. */
export function borderSide(m: StateModel, id: string, grid: GridLayout): Side | undefined {
  const r = pointFrame(m, id, grid);
  const p = grid.nodes.find((n) => n.id === id)?.rect;
  if (!r || !p) return undefined;
  const [x, y] = [cx(p), cy(p)];
  const gaps: [Side, number][] = [
    ['top', Math.abs(y - r.y)],
    ['bottom', Math.abs(y - bottom(r))],
    ['left', Math.abs(x - r.x)],
    ['right', Math.abs(x - right(r))],
  ];
  return gaps.sort((a, b) => a[1] - b[1])[0]?.[0];
}
