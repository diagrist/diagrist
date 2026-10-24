import type { Rect } from '@diagrist/core';
import type { Row } from '@diagrist/layout-grid';
import type { Layer } from '../model/types.js';
import type { Segment, Spot } from './art.js';
import { type Metrics, measure } from './metrics.js';

/** A layer named right of the picture: box, text, leader with arrow, and for the first the shared bracket. */
export interface LayerArt {
  readonly row: string;
  readonly label: string;
  readonly rect: Rect;
  readonly text: Spot;
  readonly leader: Segment;
  readonly arrow: string;
  readonly spine?: Segment;
  readonly attachment?: Segment;
}

/** Boxes for the layers right of everything drawn (`contentRight`), joined to the picture by one bracket. */
export function layerArts(
  layers: readonly Layer[],
  rows: readonly Row[],
  contentRight: number,
  m: Metrics,
): LayerArt[] {
  const placed = layers
    .flatMap((l) => {
      const row = rows.find((r) => r.name === l.row);
      return row ? [{ ...l, middle: row.y + row.h / 2 }] : [];
    })
    .sort((a, b) => a.middle - b.middle);
  const [first] = placed;
  const last = placed.at(-1);
  if (!first || !last) return [];
  const pad = m.nodePad;
  const width = Math.max(m.nodeW, ...placed.map((l) => measure(l.label, m.fontSize.note) + 2 * pad));
  const railX = contentRight + pad * 2;
  const x = railX + pad * 3;
  const middle = placed[Math.floor(placed.length / 2)]?.middle ?? first.middle;
  const height = m.fontSize.note + pad * 2;
  return placed.map((l, i) => {
    const rect = { x, y: l.middle - height / 2, w: width, h: height };
    const tip = x - pad / 2;
    const size = m.markerSize / 2;
    return {
      row: l.row,
      label: l.label,
      rect,
      text: { x: x + width / 2, y: rect.y + rect.h / 2 + m.fontSize.note * 0.35 },
      leader: { x1: railX, x2: tip, y1: l.middle, y2: l.middle },
      arrow: `M${tip} ${l.middle} L${tip - size} ${l.middle - size / 2} L${tip - size} ${l.middle + size / 2} Z`,
      ...(i === 0
        ? {
            spine: { x1: railX, x2: railX, y1: first.middle, y2: last.middle },
            attachment: { x1: contentRight, x2: railX, y1: middle, y2: middle },
          }
        : {}),
    };
  });
}
