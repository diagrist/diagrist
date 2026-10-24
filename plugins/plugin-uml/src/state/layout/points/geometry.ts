import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, cy, type GridLayout, type PlacedNode, right, type Side } from '@diagrist/layout-grid';
import { frameOf, isBorderPoint, isInside, type StateModel } from '../../model.js';
import { STATE as S } from '../metrics.js';

/** Does the bounding box of a segment reach into the rectangle widened by `pad`? */
export const segmentHits = (p: Point, q: Point, r: Rect, pad = 0): boolean =>
  Math.min(p[0], q[0]) < right(r) + pad &&
  Math.max(p[0], q[0]) > r.x - pad &&
  Math.min(p[1], q[1]) < bottom(r) + pad &&
  Math.max(p[1], q[1]) > r.y - pad;

/** How many of `rects` the path touches. */
export const hits = (path: readonly Point[], rects: readonly Rect[]): number =>
  rects.filter((r) => path.slice(1).some((p, i) => segmentHits(path[i] ?? p, p, r, 2))).length;

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

/** Does a vertex lie in the frame `frame`, on its border included? */
export function inFrame(m: StateModel, id: string | undefined, frame: string): boolean {
  if (id === undefined || !m.vertices.has(id)) return false;
  const own = borderOf(m, id) ?? frameOf(m, m.vertices.get(id)?.parent);
  return own !== undefined && (own === frame || isInside(m, own, frame));
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

/** A point on the submachine symbol at the bottom right would lie on it. */
export const nearIcon = (r: Rect, at: Point, side: Side): boolean =>
  side === 'right' && at[1] > bottom(r) - S.subInset - S.subH - S.point / 2;

/**
 * Transitions ending at the submachine state itself dock in the middle of the side towards their partner. A point
 * there would lie on their line: close beside it costs a little, right on it as much as a taken place.
 */
export function onDirectLine(r: Rect, at: Point, side: Side, direct: readonly Rect[]): number {
  const flat = side === 'top' || side === 'bottom';
  const beyond = (p: Rect) =>
    side === 'top'
      ? bottom(p) <= r.y
      : side === 'bottom'
        ? p.y >= bottom(r)
        : side === 'left'
          ? right(p) <= r.x
          : p.x >= right(r);
  const off = Math.abs((flat ? at[0] : at[1]) - (flat ? cx(r) : cy(r)));
  if (!direct.some(beyond)) return 0;
  return off < S.point ? 3000 : off < 2 * S.point ? 300 : 0;
}

/** Partners of the transitions that dock at a state itself. */
export function directPartners(m: StateModel, host: string, nodes: readonly PlacedNode[]): Rect[] {
  return m.diagram.transitions
    .flatMap((t) => (t.from === host ? [t.to] : t.to === host ? [t.from] : []))
    .flatMap((id) => nodes.find((n) => n.id === id)?.rect ?? []);
}
