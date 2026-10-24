import { type Point, textWidth } from '@diagrist/core';
import { longestSegment } from '../geometry.js';
import type { Route } from '../layout.js';
import type { GridMetrics } from '../spec.js';
import { labelLine } from './text.js';
import type { EdgeLabel, EdgeText } from './types.js';
import { wrapTwo } from './wrap.js';

/** Room a text keeps from the ends of its segment, and the width past which a text across a line wraps. */
const ROOM = 24;
const ACROSS = 80;

/** The longest horizontal segment that holds a text `width` wide; else the longest segment of all. */
function seat(points: readonly Point[], width: number): ReturnType<typeof longestSegment> {
  const flat = points
    .slice(1)
    .flatMap((q, i) => (points[i]?.[1] === q[1] ? [[points[i] as Point, q] as const] : []))
    .map(([a, b]) => ({ p1: a, p2: b, len: Math.abs(b[0] - a[0]) }))
    .filter((s) => s.len >= width + ROOM);
  return (
    flat.reduce<ReturnType<typeof longestSegment> | undefined>(
      (best, s) => (best === undefined || s.len > best.len ? s : best),
      undefined,
    ) ?? longestSegment(points)
  );
}

/**
 * Name and detail of one route as one block standing on its line, the middle of the block on the middle of a
 * segment, so the kind can cut the line behind it. A horizontal segment that holds the text is preferred; a name
 * wider than its segment, or wide across a vertical one, wraps into two lines, and the detail stands below it.
 */
export function onLineTexts(text: EdgeText, idx: number, routes: readonly Route[], metrics: GridMetrics): EdgeLabel[] {
  const r = routes[idx] as Route;
  const font = metrics.labelFont;
  const { name, detail } = text;
  const widest = Math.max(textWidth(name ?? '', font), textWidth(detail ?? '', font));
  const { p1, p2, len } = seat(r.points, widest);
  const horizontal = p1[1] === p2[1];
  const room = horizontal ? len - ROOM : ACROSS;
  const names = name ? (textWidth(name, font) > room ? wrapTwo(name) : [name]) : [];
  const lines: [string, EdgeLabel['part']][] = [
    ...names.map((s): [string, EdgeLabel['part']] => [s, 'name']),
    ...(detail ? [[detail, 'detail'] as [string, EdgeLabel['part']]] : []),
  ];
  const mx = (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2;
  const middle = (lines.length - 1) / 2;
  const lift = Math.round(font.size * 0.36);
  return lines.map(([s, part], k) =>
    labelLine(s, { x: mx, y: my + (k - middle) * metrics.labelLineH + lift, anchor: 'middle' }, idx, part, metrics),
  );
}
