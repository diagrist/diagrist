import type { Rect } from '@diagrist/core';
import { bottom, cx, right, type Side } from '../geometry.js';
import type { PortRequest } from './adaptive-ports.js';
import type { Board, Box } from './boxes.js';
import { type BundlePlan, crestOf } from './bundle.js';
import type { Routed } from './routed.js';
import { ellipseOf } from './snap.js';

/** Both ends of a route in an adaptive grid and the ports they ask for. */
export interface Plan {
  readonly a: Box;
  readonly b: Box;
  readonly from: PortRequest;
  readonly to: PortRequest;
}

/** A column gap of the grid lies between the rectangles: they stand in different columns. */
const apart = (a: Rect, b: Rect, gutters: readonly number[]) =>
  gutters.some((g) => (g >= right(a) && g <= b.x) || (g >= right(b) && g <= a.x));

/** Sides of an edge; for long edges (over more than one row) `mode` picks one of three ways round. */
function sides(a: Rect, b: Rect, long: boolean, mode: number, gutters: readonly number[]): [Side, Side] {
  if (long && b.y > bottom(a))
    return mode === 0
      ? [right(a) > b.x ? 'left' : 'right', 'bottom']
      : mode === 1
        ? ['right', 'right']
        : ['bottom', 'top'];
  if (!long && apart(a, b, gutters) && (b.y >= bottom(a) || a.y >= bottom(b)))
    return [b.y >= bottom(a) ? 'bottom' : 'top', b.x >= right(a) ? 'left' : 'right'];
  if (b.y >= bottom(a)) return ['bottom', 'top'];
  if (a.y >= bottom(b)) return ['top', 'bottom'];
  return cx(a) < cx(b) ? ['right', 'left'] : ['left', 'right'];
}

/** A lane column: vertical edges attach in its middle. */
function laneAt(board: Board, r: Routed, side: Side): { at?: number } {
  const col = r.edge.lane ? board.layout.cols.find((c) => c.name === r.edge.lane) : undefined;
  return col && (side === 'top' || side === 'bottom') ? { at: col.x + col.w / 2 } : {};
}

/** Below the crest of a node the top edge stays free. */
function crestZone(board: Board, box: Box, side: Side, gap: number): [number, number] | undefined {
  const c = crestOf(board, box, side);
  return c ? [c.cx - c.r - gap, c.cx + c.r + gap] : undefined;
}

/**
 * The part of a side that a route laid by the kind (a loop) touches, widened by `gap`: other edges dock beside it.
 */
function fixedZone(routes: readonly Routed[], box: Box, side: Side, gap: number): [number, number] | undefined {
  const fixed = routes.find(
    (r) => r.edge.route !== undefined && r.from.id === box.id && (r.fromSide === side || r.toSide === side),
  );
  if (!fixed) return undefined;
  const flat = side === 'top' || side === 'bottom';
  const along = fixed.points.map((p) => (flat ? p[0] : p[1]));
  return [Math.min(...along) - gap, Math.max(...along) + gap];
}

/** Vertically overlapping pairs share the part to keep free, so the edge stays straight. */
function zones(board: Board, a: Box, b: Box, s: readonly [Side, Side], gap: number) {
  const za = crestZone(board, a, s[0], gap);
  const zb = crestZone(board, b, s[1], gap);
  const vertical = s[0] === 'top' || s[0] === 'bottom';
  const shared = vertical && b.rect.x < right(a.rect) && a.rect.x < right(b.rect);
  if (!shared) return { from: za, to: zb };
  const both = [za, zb].filter((z): z is [number, number] => z !== undefined);
  const hull: [number, number] | undefined = both.length
    ? [Math.min(...both.map((z) => z[0])), Math.max(...both.map((z) => z[1]))]
    : undefined;
  return { from: hull, to: hull };
}

export function plansOf(
  routes: readonly Routed[],
  board: Board,
  bundles: readonly BundlePlan[],
  mode: number,
  attempt: number,
  gap: number,
): (Plan | undefined)[] {
  const inBundle = new Map<number, { bundle: BundlePlan; k: number }>();
  for (const bundle of bundles)
    bundle.members.forEach((i, k) => {
      inBundle.set(i, { bundle, k });
    });
  return routes.map((r, i): Plan | undefined => {
    const a = r.from;
    const b = r.to;
    if (r.shape === 'loop') return undefined;
    const member = inBundle.get(i);
    if (member) {
      const leaf = member.bundle.leafRequests[member.k] as PortRequest;
      const hub = member.bundle.hubRequest;
      return member.bundle.fanIn ? { a, b, from: leaf, to: hub } : { a, b, from: hub, to: leaf };
    }
    const isGroup = (box: Box) => box.id.startsWith('group:');
    const long = !isGroup(a) && !isGroup(b) && Math.abs(b.rowIndex - a.rowIndex) > 1;
    const [fromSide, toSide] = r.edge.sides?.[attempt] ?? sides(a.rect, b.rect, long, mode, board.layout.gutters.cols);
    const crest = zones(board, a, b, [fromSide, toSide], gap);
    const free = {
      from: crest.from ?? fixedZone(routes, a, fromSide, gap),
      to: crest.to ?? fixedZone(routes, b, toSide, gap),
    };
    const at = laneAt(board, r, fromSide);
    return {
      a,
      b,
      from: {
        id: a.id,
        rect: a.rect,
        other: b.rect,
        side: fromSide,
        ...(free.from ? { avoid: free.from } : {}),
        ...at,
      },
      to: { id: b.id, rect: b.rect, other: a.rect, side: toSide, ...(free.to ? { avoid: free.to } : {}), ...at },
    };
  });
}

const across = (s: Side) => s === 'left' || s === 'right';
/** The other end lies so that a horizontal line reaches straight over. */
const level = (r: PortRequest) => r.other.y < bottom(r.rect) && r.rect.y < bottom(r.other);
const separate = (a: Rect, b: Rect) => right(a) <= b.x || right(b) <= a.x;

/**
 * The left and right side of a flat ellipse are short and steep. Where a straight horizontal edge shares such a
 * side with edges coming in at a slant, those dock at the top or bottom instead, and their other end leaves
 * horizontally: one bend as before, and the straight edge stays straight.
 */
export function ellipseSides(plans: readonly (Plan | undefined)[], board: Board): (Plan | undefined)[] {
  const key = (r: PortRequest) => `${r.id}:${r.side}`;
  const straight = new Set(
    plans.flatMap((p) => (p ? [p.from, p.to] : [])).flatMap((r) => (level(r) && across(r.side) ? [key(r)] : [])),
  );
  const crowded = (r: PortRequest) =>
    across(r.side) && !r.center && !level(r) && straight.has(key(r)) && ellipseOf(board, r.id) !== undefined;
  return plans.map((p) => {
    if (!p || p.from.center || p.to.center || !separate(p.a.rect, p.b.rect)) return p;
    const [end, other] = crowded(p.to) ? [p.to, p.from] : crowded(p.from) ? [p.from, p.to] : [];
    if (!end || !other || across(other.side)) return p;
    const vertical: Side = bottom(end.other) <= end.rect.y ? 'top' : 'bottom';
    const sideways: Side = right(other.rect) <= other.other.x ? 'right' : 'left';
    const turned = (r: PortRequest, side: Side): PortRequest => ({ id: r.id, rect: r.rect, other: r.other, side });
    const next =
      end === p.to
        ? { from: turned(other, sideways), to: turned(end, vertical) }
        : { from: turned(end, vertical), to: turned(other, sideways) };
    return { ...p, ...next };
  });
}
