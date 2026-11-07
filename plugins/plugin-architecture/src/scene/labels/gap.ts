import type { Point, Shape } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import { TEXT_GAP as GAP } from '../../layout/marks.js';
import { type Surface, surfacesAt } from '../surfaces.js';

/** Whether a segment of the line through `points` runs into the rectangle. */
function through(points: readonly Point[], x: number, y: number, w: number, h: number): boolean {
  return points.slice(1).some((q, i) => {
    const p = points[i] as Point;
    const [x1, x2, y1, y2] = [Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1])];
    return x1 < x + w && x2 > x && y1 < y + h && y2 > y;
  });
}

/**
 * The texts of one route on a gap (`edgeText.ground: gap`): first a rectangle in the colour of the ground, which
 * cuts the line behind them, then name in ink and detail in the second ink. Texts that stand beside their line, as
 * where it had no stretch for them (`points` the route's line), cut nothing.
 */
export function gapShapes(labels: readonly EdgeLabel[], under: readonly Surface[], points: readonly Point[]): Shape[] {
  if (labels.length === 0) return [];
  const left = Math.min(...labels.map((l) => l.box.x)) - GAP.x;
  const top = Math.min(...labels.map((l) => l.box.y)) - GAP.y;
  const w = Math.max(...labels.map((l) => l.box.x + l.box.w)) + GAP.x - left;
  const h = Math.max(...labels.map((l) => l.box.y + l.box.h)) + GAP.y - top;
  const zone = surfacesAt(under, left + w / 2, top + h / 2).some((s) => s.tone === 'zone');
  const cut: Shape[] = through(points, left, top, w, h)
    ? [{ kind: 'rect', x: left, y: top, w, h, role: zone ? 'labelGapZone' : 'labelGap' }]
    : [];
  return [
    ...cut,
    ...labels.map(
      (l): Shape => ({
        kind: 'text',
        x: l.x,
        y: l.y,
        text: l.text,
        role: l.part === 'detail' ? 'edgeDetail' : 'edgeLabel',
        font: 'label',
        anchor: l.anchor,
      }),
    ),
  ];
}
