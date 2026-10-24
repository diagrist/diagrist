import type { Rect } from '@diagrist/core';
import type { Side } from '@diagrist/layout-grid';
import { cx, cy, right, type XY } from './metrics.js';
import type { ActivityPlacement } from './place.js';
import type { RankedFlow } from './rank.js';

/** Where an edge attaches: a point on the edge of a node and the side it leaves or enters by. */
export interface Port {
  readonly at: XY;
  readonly side: Side;
}

/** Distance from which an edge leaves a diamond at its side instead of at the bottom. */
const SIDEWAYS = 4;

const kindOf = (ap: ActivityPlacement, id: string) => ap.placement.nodes.get(id)?.node.kind;
const isBar = (ap: ActivityPlacement, id: string) => ['fork', 'join'].includes(kindOf(ap, id) ?? '');
const rectOf = (ap: ActivityPlacement, id: string): Rect =>
  ap.placement.nodes.get(id)?.rect ?? { x: 0, y: 0, w: 0, h: 0 };

const where = (ap: ActivityPlacement, id: string): number => {
  const r = ap.placement.nodes.get(id)?.rect;
  return r ? cx(r) : (ap.points.get(id)?.[0] ?? 0);
};

/** A bar takes an edge vertically above or below its other end, as far as it reaches. */
function onBar(ap: ActivityPlacement, id: string, x: number): number {
  const r = ap.placement.nodes.get(id)?.rect;
  if (!r || !isBar(ap, id)) return where(ap, id);
  return Math.min(right(r) - 2, Math.max(r.x + 2, x));
}

/** The next waypoint after the source, and the last one before the target; back edges come from far right. */
const nextX = (ap: ActivityPlacement, f: RankedFlow) =>
  f.back ? Infinity : onBar(ap, f.dummies[0] ?? f.to, where(ap, f.from));
const prevX = (ap: ActivityPlacement, f: RankedFlow) =>
  f.back ? Infinity : onBar(ap, f.dummies.at(-1) ?? f.from, where(ap, f.to));

/**
 * Sides of a diamond: the outermost edge on the left takes the left corner, the outermost on the right the right
 * one, all others the bottom (out) or the top (in). So alternatives stand symmetrically.
 */
function diamondSides(
  flows: readonly RankedFlow[],
  r: Rect,
  x: (f: RankedFlow) => number,
  vertical: Side,
): Map<number, Side> {
  const sorted = [...flows].sort((a, b) => x(a) - x(b) || a.index - b.index);
  const sides = new Map<number, Side>(sorted.map((f) => [f.index, vertical]));
  const first = sorted[0];
  const last = sorted.at(-1);
  if (last && x(last) > right(r) + SIDEWAYS) sides.set(last.index, 'right');
  if (first && x(first) < r.x - SIDEWAYS) sides.set(first.index, 'left');
  return sides;
}

function pointOn(r: Rect, side: Side, x: number): XY {
  switch (side) {
    case 'left':
      return [r.x, cy(r)];
    case 'right':
      return [right(r), cy(r)];
    case 'top':
      return [x, r.y];
    case 'bottom':
      return [x, r.y + r.h];
  }
}

/**
 * Back edges leave and enter on the right. When the right side is taken already, or a node stands beside up to the
 * channel, they leave at the bottom or enter at the top, over the gap between layers.
 */
function backSides(ap: ActivityPlacement, outSide: Map<number, Side>, inSide: Map<number, Side>): void {
  const flows = ap.ranks.flows;
  const nodes = [...ap.placement.nodes.values()];
  const usedRight = (id: string, k: number) =>
    flows.some(
      (o) =>
        o.index !== k &&
        ((o.from === id && outSide.get(o.index) === 'right') || (o.to === id && inSide.get(o.index) === 'right')),
    );
  const blocked = (id: string, channel: number) => {
    const r = rectOf(ap, id);
    const y = cy(r);
    return nodes.some(
      (n) => n.id !== id && n.rect.y < y && y < n.rect.y + n.rect.h && n.rect.x >= right(r) && n.rect.x < channel,
    );
  };
  for (const f of flows) {
    if (!f.back || f.from === f.to) continue;
    const channel = ap.channels.get(f.index)?.x ?? Infinity;
    if (usedRight(f.from, f.index) || blocked(f.from, channel)) outSide.set(f.index, 'bottom');
    if (usedRight(f.to, f.index) || blocked(f.to, channel)) inSide.set(f.index, 'top');
  }
}

/** Exit and entry per edge. Bars dock vertically above or below the neighbour. */
export function ports(ap: ActivityPlacement): Map<number, { from: Port; to: Port }> {
  const flows = ap.ranks.flows;
  const outSide = new Map<number, Side>();
  const inSide = new Map<number, Side>();
  for (const [id, p] of ap.placement.nodes) {
    const outs = flows.filter((f) => f.from === id && f.from !== f.to);
    const ins = flows.filter((f) => f.to === id && f.from !== f.to);
    if (p.node.kind === 'decision' && !p.node.port)
      for (const [k, s] of diamondSides(outs, p.rect, (f) => nextX(ap, f), 'bottom')) outSide.set(k, s);
    if (p.node.kind === 'merge')
      for (const [k, s] of diamondSides(ins, p.rect, (f) => prevX(ap, f), 'top')) inSide.set(k, s);
    for (const f of outs.filter((o) => o.side)) {
      const [a, b] = [ap.ranks.laneOf.get(f.from) ?? 0, ap.ranks.laneOf.get(f.to) ?? 0];
      const toRight = b > a || (b === a && where(ap, f.to) > where(ap, f.from));
      outSide.set(f.index, toRight ? 'right' : 'left');
      inSide.set(f.index, toRight ? 'left' : 'right');
    }
    for (const f of outs) if (!outSide.has(f.index)) outSide.set(f.index, f.back ? 'right' : 'bottom');
    for (const f of ins) if (!inSide.has(f.index)) inSide.set(f.index, f.back ? 'right' : 'top');
  }
  backSides(ap, outSide, inSide);
  const clampX = (id: string, x: number) => (isBar(ap, id) ? onBar(ap, id, x) : where(ap, id));
  const out = new Map<number, { from: Port; to: Port }>();
  for (const f of flows) {
    const a = rectOf(ap, f.from);
    const b = rectOf(ap, f.to);
    const fromSide = f.from === f.to ? 'right' : (outSide.get(f.index) ?? 'bottom');
    const toSide = f.from === f.to ? 'right' : (inSide.get(f.index) ?? 'top');
    const aside = f.handler ? Math.sign(where(ap, f.to) - cx(a)) * (a.w / 4) : 0;
    const fromX = clampX(f.from, f.back ? cx(a) : nextX(ap, f)) + aside;
    const toX = clampX(f.to, f.back ? cx(b) : prevX(ap, f));
    out.set(f.index, {
      from: { at: pointOn(a, fromSide, fromX), side: fromSide },
      to: { at: pointOn(b, toSide, toX), side: toSide },
    });
  }
  return out;
}
