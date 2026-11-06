import type { Point } from '@diagrist/core';
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

/** The lines of a label, each with its width: its own lines, or its text as one. */
const linesOf = (label: NonNullable<LayeredEdge['label']>) => label.lines ?? [{ text: label.text, width: label.width }];

/** The height of a label: its lines, each as high as its font and two pixels. */
const heightOf = (label: LayeredEdge['label']) => (label ? linesOf(label).length * (label.size + 2) : 0);

/**
 * The room a gap needs for its labels at its top and at its bottom: the highest label there and its gaps, so the gap
 * grows for a label of several lines. A label in `grown`, which found no clear spot, asks twice its height, so the
 * first track keeps clear of it.
 */
export function labelRoom(
  seats: readonly Seat[],
  gap: number,
  at: Seat['at'],
  labelGap: number,
  grown: ReadonlySet<string> = new Set(),
): number {
  const sizes = seats
    .filter((s) => s.gap === gap && s.at === at)
    .map((s) => heightOf(s.edge.label) * (grown.has(s.edge.id) ? 2 : 1) + (grown.has(s.edge.id) ? labelGap : 0));
  return sizes.length === 0 ? 0 : Math.max(...sizes) + 2 * labelGap;
}

/**
 * A label at its seat: right of its vertical, `labelGap` from the port `port` of its line, below the port at the top
 * of its gap and above it at the bottom, one text per line of the label, `route` being the index of its route. The
 * spot search (`spotLabels`) keeps it there where that is clear and looks along the line otherwise.
 */
export function seatAt(seat: Seat, port: Point, route: number, labelGap: number): EdgeLabel[] {
  const label = seat.edge.label ?? { text: '', width: 0, size: 0 };
  const line = label.size + 2;
  const [x, py] = [port[0] + labelGap, port[1]];
  const top = seat.at === 'top' ? py + labelGap : py - labelGap - heightOf(label);
  return linesOf(label).map((l, i) => ({
    text: l.text,
    x,
    y: top + i * line + label.size,
    anchor: 'start' as const,
    box: { x, y: top + i * line, w: l.width, h: line },
    route,
    part: 'name' as const,
  }));
}
