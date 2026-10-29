import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, cy, right, type Side } from '../geometry.js';
import { portPoint } from './ports.js';

/** An end asking for a port on a side of its box. */
export interface PortRequest {
  readonly id: string;
  readonly rect: Rect;
  readonly other: Rect;
  readonly side: Side;
  /** Attach in the middle when the other end does not overlap, instead of towards it; bundles stay straight. */
  readonly center?: boolean;
  /** Part of the side to keep free, such as below the icon of a card. */
  readonly avoid?: readonly [number, number];
  /** Fixed position along the side, such as the middle of a lane column. */
  readonly at?: number;
}

/** Moves a port out of the part to keep free, to the left or top if it fits there. */
function outside(v: number, [a, b]: readonly [number, number], lo: number, hi: number): number {
  if (v <= a || v >= b) return v;
  if (a >= lo) return a;
  return b <= hi ? b : v;
}

const gapTo = (a: Rect, b: Rect) =>
  Math.max(0, b.x - right(a), a.x - right(b)) + Math.max(0, b.y - bottom(a), a.y - bottom(b));

const evenly = (n: number, a: number, b: number) =>
  Array.from({ length: n }, (_, i) => (n === 1 ? (a + b) / 2 : a + ((b - a) * i) / (n - 1)));

/**
 * On a conflict the edge to the nearest other end keeps its preferred place, so it stays straight; the rest move
 * aside towards their other ends. If that does not fit, or the nearest is not unique (parallel edges to one node),
 * undefined: then the ports spread evenly over the whole side.
 */
function keepNearest(
  sorted: readonly PortRequest[],
  preferred: readonly number[],
  lo: number,
  hi: number,
  gap: number,
): Map<PortRequest, number> | undefined {
  const first = sorted[0] as PortRequest;
  const near = sorted.reduce(
    (best, r, i) => (gapTo(r.rect, r.other) < gapTo(best.r.rect, best.r.other) ? { r, i } : best),
    { r: first, i: 0 },
  );
  const nearest = gapTo(near.r.rect, near.r.other);
  if (sorted.some((r) => r !== near.r && gapTo(r.rect, r.other) === nearest)) return undefined;
  const at = preferred[near.i] as number;
  const horizontal = near.r.side === 'top' || near.r.side === 'bottom';
  const center = horizontal ? cx : cy;
  const rest = sorted.filter((r) => r !== near.r);
  const before = rest.filter((r) => center(r.other) < at);
  const after = rest.filter((r) => center(r.other) >= at);
  const fits = (n: number, a: number, b: number) => n === 0 || (b >= a && (b - a) / Math.max(1, n - 1) >= gap);
  const left: [number, number] = [lo, at - 2 * gap];
  const rightSpan: [number, number] = [at + 2 * gap, hi];
  if (!fits(before.length, ...left) || !fits(after.length, ...rightSpan)) return undefined;
  const out = new Map<PortRequest, number>([[near.r, at]]);
  for (const [i, v] of evenly(before.length, ...left).entries()) out.set(before[i] as PortRequest, v);
  for (const [i, v] of evenly(after.length, ...rightSpan).entries()) out.set(after[i] as PortRequest, v);
  return out;
}

/** How far apart the middles of two boxes may lie for a line between them to stay straight with centred ends. */
const NEARLY = 0.2;

/**
 * Ports of an adaptive grid. The other ends set the order, so fans do not interlock. `centred` spreads the ends of a
 * side evenly instead of towards the other ends, except a line whose boxes nearly share their middle.
 */
export function adaptivePorts(requests: readonly PortRequest[], gap: number, centred = false): Map<PortRequest, Point> {
  const groups = new Map<string, PortRequest[]>();
  for (const request of requests) {
    const key = `${request.id}:${request.side}`;
    const group = groups.get(key) ?? [];
    group.push(request);
    groups.set(key, group);
  }
  const result = new Map<PortRequest, Point>();
  for (const group of groups.values()) {
    const first = group[0] as PortRequest;
    const horizontal = first.side === 'top' || first.side === 'bottom';
    const lo = (horizontal ? first.rect.x : first.rect.y) + gap;
    const hi = (horizontal ? right(first.rect) : bottom(first.rect)) - gap;
    const center = horizontal ? cx : cy;
    if (lo > hi) {
      for (const r of group) result.set(r, portPoint(r.rect, r.side, center(r.rect)));
      continue;
    }
    const sorted = [...group].sort(
      (a, b) =>
        (center(a.other) - center(b.other)) * (first.side === 'bottom' && first.other.y < first.rect.y ? -1 : 1),
    );
    const preferred = sorted.map((r, i) => {
      const otherLo = (horizontal ? r.other.x : r.other.y) + gap;
      const otherHi = (horizontal ? right(r.other) : bottom(r.other)) - gap;
      const a = Math.max(lo, otherLo);
      const b = Math.min(hi, otherHi);
      if (r.at !== undefined) return Math.max(lo, Math.min(hi, r.at));
      const mid = center(r.rect);
      if (centred) {
        const size = Math.min(hi - lo, (horizontal ? r.other.w : r.other.h) - 2 * gap);
        const near = a <= b && Math.abs(mid - center(r.other)) <= NEARLY * size;
        return near ? (a + b) / 2 : lo + ((hi - lo) * (i + 1)) / (sorted.length + 1);
      }
      const inside = a <= b && r.center && mid >= a && mid <= b;
      const v = inside ? mid : a <= b ? (a + b) / 2 : r.center ? mid : Math.max(lo, Math.min(hi, center(r.other)));
      return r.avoid ? outside(v, r.avoid, lo, hi) : v;
    });
    const conflict = preferred.some((v, i) => i > 0 && v - (preferred[i - 1] as number) < gap);
    const spread = (i: number) => lo + ((hi - lo) * i) / (sorted.length - 1);
    const kept = conflict && sorted.length > 1 ? keepNearest(sorted, preferred, lo, hi, gap) : undefined;
    sorted.forEach((r, i) => {
      const along = !conflict || sorted.length === 1 ? (preferred[i] as number) : (kept?.get(r) ?? spread(i));
      result.set(r, portPoint(r.rect, r.side, along));
    });
  }
  return result;
}
