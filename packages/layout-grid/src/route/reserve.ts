import type { Rect } from '@diagrist/core';
import { right, type Side } from '../geometry.js';
import type { GridNode } from '../spec.js';
import type { Box } from './boxes.js';
import type { Port } from './ports.js';

const flat = (side: Side): boolean => side === 'top' || side === 'bottom';

/** The reserved stretch of a side of a node, as coordinates along that side, or none. */
export function reservedOn(node: GridNode | undefined, rect: Rect, side: Side): readonly [number, number] | undefined {
  const stretch = node?.reserve?.[side];
  if (stretch === undefined) return undefined;
  const start = flat(side) ? rect.x : rect.y;
  const base = stretch.origin === 'middle' ? start + (flat(side) ? rect.w : rect.h) / 2 : start;
  return [base + stretch.from, base + stretch.to];
}

/** An edge of the fixed grid with its sides, its shape and where its ends sit along their sides. */
interface Ported {
  readonly a: Box;
  readonly b: Box;
  readonly fromSide: Side;
  readonly toSide: Side;
  readonly shape: string;
  readonly port: Port;
}

/**
 * Ends of a fixed grid that dock on a reserved stretch of a top or bottom side move right of it, `gap` beside its
 * end. They move by lanes: every end at the same position goes to the same new one, the right end of the widest
 * stretch in that lane, so a column of boxes keeps one straight spine. An end moves only while it stays `gap` inside
 * its side, and a straight edge only with both ends; the corners of the other shapes follow their ends.
 */
export function clearReserved<T extends Ported>(
  items: readonly T[],
  node: (id: string) => GridNode | undefined,
  gap: number,
): T[] {
  const ends = (p: T) => [
    { box: p.a, side: p.fromSide, at: p.port.from },
    { box: p.b, side: p.toSide, at: p.port.to },
  ];
  const lanes = new Map<number, number>();
  for (const end of items.flatMap(ends)) {
    const stretch = flat(end.side) ? reservedOn(node(end.box.id), end.box.rect, end.side) : undefined;
    if (stretch && end.at > stretch[0] - gap && end.at < stretch[1] + gap)
      lanes.set(end.at, Math.max(lanes.get(end.at) ?? end.at, stretch[1] + gap));
  }
  if (lanes.size === 0) return [...items];
  const target = (end: ReturnType<typeof ends>[number]): number | undefined => {
    const x = flat(end.side) ? lanes.get(end.at) : undefined;
    return x !== undefined && x >= end.box.rect.x + gap && x <= right(end.box.rect) - gap ? x : undefined;
  };
  return items.map((p) => {
    const [from, to] = ends(p).map(target);
    if (p.shape === 'straight' && (from === undefined || to === undefined)) return p;
    if (from === undefined && to === undefined) return p;
    return { ...p, port: { from: from ?? p.port.from, to: to ?? p.port.to } };
  });
}
