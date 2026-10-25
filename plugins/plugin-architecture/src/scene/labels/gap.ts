import type { Shape } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import { type Surface, surfacesAt } from '../surfaces.js';

const GAP = { x: 4, y: 2 } as const;

/**
 * The texts of one route on a gap (`edgeText.ground: gap`): first a rectangle in the colour of the ground, which
 * cuts the line behind them, then name in ink and detail in the second ink.
 */
export function gapShapes(labels: readonly EdgeLabel[], under: readonly Surface[]): Shape[] {
  if (labels.length === 0) return [];
  const left = Math.min(...labels.map((l) => l.box.x)) - GAP.x;
  const top = Math.min(...labels.map((l) => l.box.y)) - GAP.y;
  const w = Math.max(...labels.map((l) => l.box.x + l.box.w)) + GAP.x - left;
  const h = Math.max(...labels.map((l) => l.box.y + l.box.h)) + GAP.y - top;
  const zone = surfacesAt(under, left + w / 2, top + h / 2).some((s) => s.tone === 'zone');
  return [
    { kind: 'rect', x: left, y: top, w, h, role: zone ? 'labelGapZone' : 'labelGap' },
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
