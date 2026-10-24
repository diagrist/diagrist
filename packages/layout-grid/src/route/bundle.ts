import type { Rect } from '@diagrist/core';
import { bottom, cy, OPPOSITE, right, type Side, union } from '../geometry.js';
import type { PortRequest } from './adaptive-ports.js';
import type { Board, Box } from './boxes.js';
import type { Routed } from './routed.js';

/**
 * A bundle: edges with one shared end (the hub) share its port and a trunk. With a shared source it fans out, with a
 * shared target it gathers in.
 */
export interface BundlePlan {
  readonly name: string;
  /** Indices of the routes, in drawing order. */
  readonly members: readonly number[];
  readonly fanIn: boolean;
  readonly hub: Box;
  /** The other end of each member. */
  readonly leaves: readonly Box[];
  /** Side of the hub the trunk leaves from. */
  readonly side: Side;
  readonly hubRequest: PortRequest;
  readonly leafRequests: readonly PortRequest[];
}

/** The side all other ends lie on, completely; undefined if there is none. */
function sideToward(hub: Rect, leaves: readonly Rect[]): Side | undefined {
  if (leaves.every((l) => l.x >= right(hub))) return 'right';
  if (leaves.every((l) => right(l) <= hub.x)) return 'left';
  if (leaves.every((l) => l.y >= bottom(hub))) return 'bottom';
  if (leaves.every((l) => bottom(l) <= hub.y)) return 'top';
  return undefined;
}

/** A branch entering a node from above lands left of its crest instead of on it. */
export function crestOf(board: Board, box: Box, side: Side): { cx: number; r: number } | undefined {
  const crest = side === 'top' ? board.node(box.id)?.crest : undefined;
  return crest === undefined ? undefined : { cx: box.rect.x + box.rect.w / 2, r: crest };
}

export function bundlePlans(routes: readonly Routed[], board: Board): BundlePlan[] {
  const byName = new Map<string, number[]>();
  routes.forEach((r, i) => {
    const name = r.edge.bundle;
    if (name && r.shape !== 'loop') byName.set(name, [...(byName.get(name) ?? []), i]);
  });
  return [...byName].flatMap(([name, members]): BundlePlan[] => {
    const ends = members.map((i) => routes[i] as Routed);
    const first = ends[0] as Routed;
    const sameFrom = ends.every((e) => e.from.id === first.from.id);
    const sameTo = ends.every((e) => e.to.id === first.to.id);
    if (!sameFrom && !sameTo) return [];
    const fanIn = !sameFrom;
    const hub = fanIn ? first.to : first.from;
    const leaves = ends.map((e) => (fanIn ? e.from : e.to));
    const side = sideToward(
      hub.rect,
      leaves.map((l) => l.rect),
    );
    if (!side) return [];
    const hubRequest: PortRequest = {
      id: hub.id,
      rect: hub.rect,
      other: union(leaves.map((l) => l.rect)),
      side,
      center: true,
    };
    const leafRequests = leaves.map((l): PortRequest => {
      const crest = crestOf(board, l, OPPOSITE[side]);
      const at =
        side === 'left' || side === 'right' ? cy(l.rect) : crest ? crest.cx - 2 * crest.r : l.rect.x + l.rect.w / 2;
      return { id: l.id, rect: l.rect, other: hub.rect, side: OPPOSITE[side], center: true, at };
    });
    return [{ name, members, fanIn, hub, leaves, side, hubRequest, leafRequests }];
  });
}
