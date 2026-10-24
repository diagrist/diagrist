import type { Point, Rect } from '@diagrist/core';
import { bottom, cx, cy, right, type Side } from '../geometry.js';

/** One end of an edge on a side of a node; `key` names the edge and orders straight ends. */
export interface Attachment {
  readonly key: number;
  readonly node: string;
  readonly rect: Rect;
  readonly side: Side;
  /** Coordinate of the other end along this side, to order the ends. */
  readonly other: number;
  readonly straight: boolean;
  /** A Z leaves the middle even alone, so its stub does not fall onto an edge coming the other way. */
  readonly zigzag: boolean;
  /** Direction of the other end along the side: -1, 0 or 1. */
  readonly dir: number;
}

export interface Ends {
  readonly from: Attachment;
  readonly to: Attachment;
}

/** Positions of both ends, each along the side of its node. */
export interface Port {
  readonly from: number;
  readonly to: number;
}

const isHorizontal = (side: Side) => side === 'left' || side === 'right';

const centerOf = (a: Attachment): number => (isHorizontal(a.side) ? cy(a.rect) : cx(a.rect));

function spread(list: readonly Attachment[], gap: number, out: Map<Attachment, number>): void {
  const first = list[0];
  if (!first) return;
  const horiz = isHorizontal(first.side);
  const center = centerOf(first);
  const length = horiz ? first.rect.h : first.rect.w;
  const start = horiz ? first.rect.y : first.rect.x;
  const straights = list.filter((a) => a.straight).sort((a, b) => a.key - b.key);
  const others = list.filter((a) => !a.straight).sort((a, b) => a.other - b.other);

  const single = straights[0];
  if (straights.length === 1 && single) out.set(single, center);
  else if (straights.length > 1)
    for (const [i, a] of straights.entries()) out.set(a, start + (length * (i + 1)) / (straights.length + 1));

  const only = others[0];
  if (straights.length === 0 && others.length === 1 && only)
    out.set(only, only.zigzag ? center + (only.dir || 1) * gap : center);
  else
    for (const [i, a] of others.entries()) {
      const k = i + 1;
      const dir = a.dir === 0 ? 1 : a.dir;
      const base = straights.length === 0 ? center - ((others.length - 1) * gap) / 2 + i * gap : center + dir * gap * k;
      out.set(a, base);
    }
}

/**
 * Spreads the ends per node and side: straight edges in the middle or evenly, bent edges beside them, ordered by
 * where their other end lies. Every item gets exactly one port, because the spreading runs over the same list.
 */
export function assignPorts<T>(items: readonly T[], endsOf: (item: T) => Ends, gap: number): (T & { port: Port })[] {
  const paired = items.map((item) => ({ item, ends: endsOf(item) }));
  const bySide = new Map<string, Attachment[]>();
  for (const { ends } of paired)
    for (const a of [ends.from, ends.to]) {
      const k = `${a.node}:${a.side}`;
      const list = bySide.get(k);
      if (list) list.push(a);
      else bySide.set(k, [a]);
    }
  const along = new Map<Attachment, number>();
  for (const list of bySide.values()) spread(list, gap, along);
  const at = (a: Attachment) => along.get(a) ?? centerOf(a);
  return paired.map(({ item, ends }) => ({ ...item, port: { from: at(ends.from), to: at(ends.to) } }));
}

export function portPoint(rect: Rect, side: Side, along: number): Point {
  switch (side) {
    case 'top':
      return [along, rect.y];
    case 'bottom':
      return [along, bottom(rect)];
    case 'left':
      return [rect.x, along];
    case 'right':
      return [right(rect), along];
  }
}
