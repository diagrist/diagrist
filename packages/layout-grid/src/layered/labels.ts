import type { Point, Rect } from '@diagrist/core';
import { segmentHitsRect } from '../geometry.js';
import type { EdgeLabel } from '../label/types.js';
import type { Group } from './links.js';
import type { Ranked } from './rank.js';
import type { LayeredEdge } from './spec.js';

/** Where a label sits: beside the top of its gap, where the line leaves a box, or beside the bottom, where it arrives. */
export interface Seat {
  readonly edge: LayeredEdge;
  readonly gap: number;
  readonly at: 'top' | 'bottom';
  readonly group: Group;
}

/**
 * The seat of every label, one per group: a fan's label at its trunk below the box it leaves, a join's at its trunk
 * above the box it reaches, a single edge's beside the start of its line as drawn, so it stands where its line is
 * the only one.
 */
export function seatsOf(edges: readonly LayeredEdge[], groups: readonly Group[], ranked: Ranked): Seat[] {
  const byId = new Map(edges.map((e) => [e.id, e]));
  const seated = new Set<string>();
  const seats: Seat[] = [];
  for (const g of groups) {
    const first = g.links[0];
    const labelled = g.links.map((l) => byId.get(l.edge)).find((e) => e?.label !== undefined);
    if (!first || !labelled || seated.has(labelled.id)) continue;
    const chain = ranked.chains.get(labelled.id) ?? [];
    const down = ranked.down.get(labelled.id) ?? true;
    const starts = down ? first.upper === chain[0] : first.lower === chain.at(-1);
    if (g.kind === 'single' && !starts) continue;
    for (const l of g.links) seated.add(l.edge);
    const at = g.kind === 'fan' || (g.kind === 'single' && down) ? 'top' : 'bottom';
    seats.push({ edge: labelled, gap: first.gap, at, group: g });
  }
  return seats;
}

/** The room a gap needs for its labels at its top and at its bottom: the highest label there and its gaps. */
export function labelRoom(seats: readonly Seat[], gap: number, at: Seat['at'], labelGap: number): number {
  const sizes = seats.filter((s) => s.gap === gap && s.at === at).map((s) => (s.edge.label?.size ?? 0) + 2);
  return sizes.length === 0 ? 0 : Math.max(...sizes) + 2 * labelGap;
}

/** What a label must keep clear of: the other lines, the boxes, the labels already set. */
export interface Clear {
  readonly lines: readonly { readonly edge: string; readonly points: readonly Point[] }[];
  readonly boxes: readonly Rect[];
  readonly margin: number;
}

const grow = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m });
const meets = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/**
 * A label at its seat: right of its vertical, `labelGap` from the port, else left of it when something else comes
 * within `margin` on the right. `x` and `y` are the port of the line, `route` the index of its route.
 */
export function seatLabel(
  seat: Seat,
  port: Point,
  route: number,
  labelGap: number,
  clear: Clear,
  own: ReadonlySet<string>,
): EdgeLabel {
  const label = seat.edge.label ?? { text: '', width: 0, size: 0 };
  const h = label.size + 2;
  const top = seat.at === 'top' ? port[1] + labelGap : port[1] - labelGap - h;
  const at = (side: 'right' | 'left'): EdgeLabel => {
    const x = side === 'right' ? port[0] + labelGap : port[0] - labelGap;
    const box = { x: side === 'right' ? x : x - label.width, y: top, w: label.width, h };
    const anchor: EdgeLabel['anchor'] = side === 'right' ? 'start' : 'end';
    return { text: label.text, x, y: top + label.size, anchor, box, route, part: 'name' };
  };
  const free = (l: EdgeLabel) => {
    const zone = grow(l.box, clear.margin);
    const lines = clear.lines.filter((o) => !own.has(o.edge));
    const hit = lines.some((o) => o.points.some((p, k) => k > 0 && segmentHitsRect(o.points[k - 1] as Point, p, zone)));
    return !hit && !clear.boxes.some((b) => meets(b, l.box));
  };
  const right = at('right');
  if (free(right)) return right;
  const left = at('left');
  return free(left) ? left : right;
}
