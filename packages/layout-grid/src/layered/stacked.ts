import type { Rect } from '@diagrist/core';
import { assignTracks, piecesOf } from './channels.js';
import type { Group, Link } from './links.js';
import { portsOf } from './ports.js';

/**
 * A line from the lower side of one box to the upper side of a box further down, for a kind that places its boxes
 * itself and routes only some of its lines through the channel router: its id and the ids of both boxes.
 */
export interface StackedLine {
  readonly id: string;
  readonly upper: string;
  readonly lower: string;
}

/** Where every line leaves its upper box (`bottom`) and reaches its lower box (`top`), by line id. */
export interface StackedPorts {
  readonly top: ReadonlyMap<string, number>;
  readonly bottom: ReadonlyMap<string, number>;
}

const groupsOf = (lines: readonly StackedLine[]): Group[] =>
  lines.map((l) => ({ kind: 'single', links: [{ edge: l.id, upper: l.upper, lower: l.lower, gap: 0 }] }));

const byId = (groups: readonly Group[], ports: ReadonlyMap<Link, number>): Map<string, number> =>
  new Map(groups.flatMap((g) => g.links.map((l): [string, number] => [l.edge, ports.get(l) ?? 0])));

/**
 * The ports of lines between boxes placed by the caller, as the layered pipeline sets them (plan 4.4): on a side the
 * ends stand in the order of their other ends, `gap` apart, each as near its other end as the side allows, and an end
 * alone on its side follows the other end of its line, so the line runs straight where both boxes share a stretch.
 * Every line keeps its own ends; nothing is bundled. `inset` keeps ends off the corners of a box, by default 16
 * pixels or a quarter of the side, always: an end never moves nearer a corner to spare a jog, since a caller that
 * places its boxes itself may round their corners, and a head on a rounded corner reads worse than a step.
 */
export function stackedPorts(
  lines: readonly StackedLine[],
  rects: ReadonlyMap<string, Rect>,
  gap: number,
  inset?: (r: Rect) => number,
): StackedPorts {
  const groups = groupsOf(lines);
  const x = new Map([...rects].map(([id, r]): [string, number] => [id, r.x + r.w / 2]));
  const ports = portsOf(groups, { dummies: new Set() }, rects, x, gap, undefined, inset, 0);
  return { top: byId(groups, ports.top), bottom: byId(groups, ports.bottom) };
}

/**
 * Tracks for the lines of one gap whose ends are not on one vertical, 0 the highest, by line id: the order that
 * loses the most crossings between the horizontal pieces and the verticals, and pieces that do not meet share a
 * track. `count` is how many tracks the gap needs.
 */
export function stackedTracks(
  lines: readonly StackedLine[],
  ports: StackedPorts,
): { readonly track: ReadonlyMap<string, number>; readonly count: number } {
  const groups = groupsOf(lines);
  const pieces = piecesOf(groups, {
    top: new Map(groups.flatMap((g) => g.links.map((l): [Link, number] => [l, ports.top.get(l.edge) ?? 0]))),
    bottom: new Map(groups.flatMap((g) => g.links.map((l): [Link, number] => [l, ports.bottom.get(l.edge) ?? 0]))),
  });
  const count = assignTracks(pieces);
  return { track: new Map(pieces.map((p) => [p.group.links[0]?.edge ?? '', p.track])), count };
}
