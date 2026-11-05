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

/** A vertical piece at an end of a line: the point at the box and how far and which way the piece runs from it. */
interface Piece {
  readonly end: Point;
  readonly run: number;
  readonly dir: 1 | -1;
}

/** The vertical pieces at both ends of a line, the one at `port` first. */
function piecesOf(points: readonly Point[], port: Point): Piece[] {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
  const piece = (end: Point | undefined, next: Point | undefined): Piece[] =>
    end && next && near(end[0], next[0]) && !near(end[1], next[1])
      ? [{ end, run: Math.abs(next[1] - end[1]), dir: next[1] > end[1] ? 1 : -1 }]
      : [];
  const ends = [...piece(points[0], points[1]), ...piece(points.at(-1), points.at(-2))];
  const atPort = (p: Piece) => near(p.end[0], port[0]) && near(p.end[1], port[1]);
  return [...ends.filter(atPort), ...ends.filter((p) => !atPort(p))];
}

/** Steps a label slides by along its line when its seat is taken. */
const SLIDE = 4;

/**
 * A label at its seat: right of its vertical, `labelGap` from the port, else left of it when something else comes
 * within `margin` on the right. When both are taken it slides along the vertical piece of its own line away from
 * the port, then along the vertical piece at the other end of the line away from that box, to the first place where
 * one side is free, and stays at the seat when there is none. `x` and `y` are the port of the line, `route` the
 * index of its route.
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
  const at = (side: 'right' | 'left', piece: Piece, by: number): EdgeLabel => {
    const [px, py] = piece.end;
    const x = side === 'right' ? px + labelGap : px - labelGap;
    const y = piece.dir > 0 ? py + labelGap + by : py - labelGap - h - by;
    const box = { x: side === 'right' ? x : x - label.width, y, w: label.width, h };
    const anchor: EdgeLabel['anchor'] = side === 'right' ? 'start' : 'end';
    return { text: label.text, x, y: y + label.size, anchor, box, route, part: 'name' };
  };
  const free = (l: EdgeLabel) => {
    const zone = grow(l.box, clear.margin);
    const lines = clear.lines.filter((o) => !own.has(o.edge));
    const hit = lines.some((o) => o.points.some((p, k) => k > 0 && segmentHitsRect(o.points[k - 1] as Point, p, zone)));
    return !hit && !clear.boxes.some((b) => meets(b, l.box));
  };
  const seated: Piece = { end: port, run: 0, dir: seat.at === 'top' ? 1 : -1 };
  const first = [at('right', seated, 0), at('left', seated, 0)];
  const found = first.find(free);
  if (found) return found;
  for (const piece of piecesOf(clear.lines[route]?.points ?? [], port)) {
    for (let by = 0; by <= piece.run - labelGap - h; by += SLIDE) {
      const slid = [at('right', piece, by), at('left', piece, by)].find(free);
      if (slid) return slid;
    }
  }
  return first[0] as EdgeLabel;
}
