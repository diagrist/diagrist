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
 * The seats of a fan or join of several lines that carry texts: each text beside its own branch, where the line
 * leaves its box into a join and where it reaches its box out of a fan, or at the top of the next piece of a line
 * that runs on, so no text stands at a trunk it shares with others. Undefined for any other group.
 */
function branchSeats(
  g: Group,
  groups: readonly Group[],
  byId: ReadonlyMap<string, LayeredEdge>,
  ranked: Ranked,
  seated: Set<string>,
): Seat[] | undefined {
  const named = new Set(g.links.flatMap((l) => (byId.get(l.edge)?.label === undefined ? [] : [l.edge])));
  if (g.kind === 'single' || named.size === 0 || new Set(g.links.map((l) => l.edge)).size < 2) return undefined;
  return g.links.flatMap((l): Seat[] => {
    const e = byId.get(l.edge);
    const chain = ranked.chains.get(l.edge) ?? [];
    if (e?.label === undefined || seated.has(e.id) || ranked.down.get(e.id) === false) return [];
    if (g.kind === 'join' && l.upper !== chain[0]) return [];
    seated.add(e.id);
    const ends = l.lower === chain.at(-1);
    const next = ends ? l : groups.flatMap((k) => k.links).find((k) => k.edge === l.edge && k.upper === l.lower);
    if (next === undefined) return [];
    const at = g.kind === 'join' || !ends ? 'top' : 'bottom';
    return [{ edge: e, gap: next.gap, at, group: { kind: 'single', links: [next] } }];
  });
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
    const own = branchSeats(g, groups, byId, ranked, seated);
    if (own !== undefined) {
      seats.push(...own);
      continue;
    }
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

/**
 * A label at the middle of a straight upright line `points` of a single edge, right of it, centred on half its
 * length (owner decision D1): where a hand would write it, and plainly its line's where two lines leave one box.
 * Undefined for a line that bends.
 */
export function middleSeat(
  seat: Seat,
  points: readonly Point[],
  route: number,
  labelGap: number,
): EdgeLabel[] | undefined {
  const [a, b] = points;
  if (points.length !== 2 || !a || !b || a[0] !== b[0]) return undefined;
  const middle = (a[1] + b[1]) / 2 - labelGap - heightOf(seat.edge.label) / 2;
  return seatAt({ ...seat, at: 'top' }, [a[0], middle], route, labelGap);
}
