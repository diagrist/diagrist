import { type Point, type Rect, textWidth } from '@diagrist/core';
import { cx, type PlacedNode, type Side } from '@diagrist/layout-grid';
import type { StateModel } from '../../model.js';
import { STATE_FONTS as F, POINT_PENALTY as P, STATE as S } from '../metrics.js';
import { borderOf, directPartners, hostOf, nearIcon, onDirectLine } from './geometry.js';

/** Does the place lie within three point widths of a point placed before? */
const nearTaken = (at: Point, taken: readonly Point[]): boolean =>
  taken.some((q) => Math.abs(q[0] - at[0]) + Math.abs(q[1] - at[1]) < 3 * S.point);

/** Does a place at the top of a composite state lie on its name, which stands in the middle there? */
function onTitle(m: StateModel, border: string, rect: Rect, at: Point, side: Side): boolean {
  if (side !== 'top') return false;
  const title = textWidth(m.vertices.get(border)?.label ?? '', F.name);
  return Math.abs(at[0] - cx(rect)) < title / 2 + S.point;
}

/**
 * What a place on `rect` costs the entry or exit point `id` besides its ways, as the penalties in the order they are
 * added: on a composite state its name, on a submachine state its icon and the lines that dock there directly, and
 * on any state a point placed before (`POINT_PENALTY`). Callers add them one by one to the length of the ways, in
 * this order, which keeps the floating point steps of the predecessor.
 */
export function pointPenalties(
  m: StateModel,
  id: string,
  place: { readonly rect: Rect; readonly at: Point; readonly side: Side },
  nodes: readonly PlacedNode[],
  taken: readonly Point[],
): number[] {
  const { rect, at, side } = place;
  const host = hostOf(m, id);
  const border = borderOf(m, id);
  return [
    border !== undefined && onTitle(m, border, rect, at, side) ? P.title : 0,
    host !== undefined && nearIcon(rect, at, side) ? P.icon : 0,
    host === undefined ? 0 : onDirectLine(rect, at, side, directPartners(m, host, nodes)),
    nearTaken(at, taken) ? P.taken : 0,
  ];
}

/** `base` with the penalties added one by one, in their order. */
export const plus = (base: number, penalties: readonly number[]): number =>
  penalties.reduce((sum, penalty) => sum + penalty, base);
