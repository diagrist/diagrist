import type { Point, Rect } from '@diagrist/core';
import type { Route } from '../layout.js';
import type { RailSide } from './rail-order.js';
import { type RailTextAt, textHeight } from './rail-texts.js';
import type { LayeredEdge, LayeredMetrics, LayeredSpec } from './spec.js';

/**
 * The stretch a rail between `upper` and `lower` takes on its track: from the middle of one box to the middle of the
 * other, where its ends dock, and its text: beside the middle of the track, over the upper end or under the lower.
 */
export function stretch(
  e: LayeredEdge,
  upper: Rect,
  lower: Rect,
  text: RailTextAt,
  gap: number,
): { lo: number; hi: number } {
  const [lo, hi] = [upper.y + upper.h / 2, lower.y + lower.h / 2];
  if (e.label === undefined) return { lo, hi };
  const tall = textHeight(e) + gap;
  if (text === 'upper') return { lo: Math.min(upper.y, lo - tall), hi };
  if (text === 'lower') return { lo, hi: Math.max(lower.y + lower.h, hi + tall) };
  const half = ((e.label.lines?.length ?? 1) * e.label.size * 1.5) / 2;
  const mid = (lo + hi) / 2;
  return { lo: Math.min(lo, mid - half), hi: Math.max(hi, mid + half) };
}

/**
 * How far the texts of other lines may reach towards `side` beside the longest upright piece of their line, where
 * that piece runs between `top` and `bottom`.
 */
export function texts(
  lines: readonly Route[],
  side: RailSide,
  top: number,
  bottom: number,
  m: LayeredMetrics,
  spec: LayeredSpec,
): number[] {
  return lines.flatMap((r): number[] => {
    const width = spec.edges.find((e) => e.id === r.edge)?.label?.width;
    if (width === undefined || r.shape === 'loop') return [];
    const upright = r.points.slice(1).flatMap((p, i) => {
      const q = r.points[i] as Point;
      return p[0] === q[0] ? [{ x: p[0], lo: Math.min(p[1], q[1]), hi: Math.max(p[1], q[1]) }] : [];
    });
    const piece = upright.reduce<(typeof upright)[number] | undefined>(
      (a, b) => (a && a.hi - a.lo >= b.hi - b.lo ? a : b),
      undefined,
    );
    if (piece === undefined || piece.hi <= top || piece.lo >= bottom) return [];
    return [side === 'left' ? piece.x - m.labelGap - width : piece.x + m.labelGap + width];
  });
}
