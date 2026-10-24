import { type Font, type Point, textWidth } from '@diagrist/core';
import { longestSegment, segmentHitsRect } from '../geometry.js';
import type { Route } from '../layout.js';
import type { GridMetrics } from '../spec.js';
import type { EdgeLabel, EdgeText } from './types.js';
import { wrapTwo } from './wrap.js';

type Anchor = EdgeLabel['anchor'];

/** The font a part of an edge text is measured in: the detail font for the detail line, else the label font. */
export const partFont = (part: EdgeLabel['part'], metrics: GridMetrics): Font =>
  part === 'detail' ? (metrics.detailFont ?? metrics.labelFont) : metrics.labelFont;

/** A label line with the box it covers: as wide as the text, from the cap height to just below the baseline. */
export function labelLine(
  text: string,
  at: { readonly x: number; readonly y: number; readonly anchor: Anchor },
  route: number,
  part: EdgeLabel['part'],
  metrics: GridMetrics,
): EdgeLabel {
  const size = metrics.labelFont.size;
  const w = textWidth(text, partFont(part, metrics));
  const left = at.anchor === 'start' ? at.x : at.anchor === 'end' ? at.x - w : at.x - w / 2;
  return { text, ...at, box: { x: left, y: at.y - size, w, h: size + 2 }, route, part };
}

const crossesOtherRoute = (box: EdgeLabel['box'], routes: readonly Route[], own: number): boolean =>
  routes.some(
    (o, i) =>
      i !== own &&
      o.points.some((p, k) => k < o.points.length - 1 && segmentHitsRect(p, o.points[k + 1] as Point, box)),
  );

/** The longest horizontal segment; without one the longest of all. */
function longestFlatSegment(points: readonly Point[]): ReturnType<typeof longestSegment> {
  const flat = points.slice(1).flatMap((q, i) => (points[i]?.[1] === q[1] ? [[points[i] as Point, q] as const] : []));
  if (!flat.length) return longestSegment(points);
  const widest = flat.reduce((a, b) => (Math.abs(b[1][0] - b[0][0]) > Math.abs(a[1][0] - a[0][0]) ? b : a));
  return longestSegment(widest);
}

/**
 * Name and detail of one route on its longest segment. On a straight horizontal line the name goes above and the
 * detail below, swapped when another route runs through the place above. A long name wraps into two lines.
 */
export function routeTexts(
  text: EdgeText,
  idx: number,
  routes: readonly Route[],
  metrics: GridMetrics,
  preferFlat: boolean,
): EdgeLabel[] {
  const r = routes[idx] as Route;
  const size = metrics.labelFont.size;
  const { p1, p2, len } = preferFlat ? longestFlatSegment(r.points) : longestSegment(r.points);
  const horizontal = p1[1] === p2[1];
  const mx = (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2;
  const out: EdgeLabel[] = [];
  const item = (s: string, x: number, y: number, anchor: Anchor, part: EdgeLabel['part']) =>
    labelLine(s, { x, y, anchor }, idx, part, metrics);
  const stacked = (s: string, avail: number, baseline: number, part: EdgeLabel['part']) => {
    const lines = textWidth(s, metrics.labelFont) > avail ? wrapTwo(s) : [s];
    for (const [i, ln] of lines.entries())
      out.push(item(ln, mx, baseline - (lines.length - 1 - i) * metrics.labelLineH, 'middle', part));
  };
  const above = my - metrics.labelGap;
  const below = my + metrics.labelGap + size - 2;
  const freeSlot = (s: string): number =>
    crossesOtherRoute(item(s, mx, above, 'middle', 'name').box, routes, idx) ? below : above;
  const { name, detail } = text;
  if (r.shape === 'straight' && horizontal) {
    const labelY = name ? freeSlot(name) : above;
    if (name) stacked(name, len - 16, labelY, 'name');
    if (detail)
      out.push(item(detail, mx, name ? (labelY === above ? below : above) : freeSlot(detail), 'middle', 'detail'));
    return out;
  }
  const full = [name, detail].filter(Boolean).join(' · ');
  if (!full) return out;
  if (horizontal) {
    stacked(full, len - 16, freeSlot(full), 'name');
    return out;
  }
  const lines = full.length > 14 ? wrapTwo(full) : [full];
  const x = text.accent ? mx + metrics.labelGap : mx - metrics.labelGap;
  const anchor: Anchor = text.accent ? 'start' : 'end';
  const y0 = my - ((lines.length - 1) * metrics.labelLineH) / 2 + Math.round(size * 0.4);
  for (const [i, ln] of lines.entries()) out.push(item(ln, x, y0 + i * metrics.labelLineH, anchor, 'name'));
  return out;
}
