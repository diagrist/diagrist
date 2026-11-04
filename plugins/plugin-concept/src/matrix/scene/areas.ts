import { type Area, areaMark, type Rect, type Shape } from '@diagrist/core';
import type { MatrixModel } from '../model.js';

/** Half a hairline: the ground of a head stays inside the rules and the frame around it, which keep their width. */
const INSET = 0.5;

/**
 * The head of a column or row `key` (ADR 0033): in a coloured area its texts stand on a ground of `role` within
 * `rect`, both in a group of the area, which tints or stripes the ground and paints the texts; otherwise the texts
 * as they are. The number of a note stays out of the group, so the area never repaints it.
 */
export function headInArea(
  model: MatrixModel,
  key: string,
  rect: Rect,
  role: 'topArea' | 'sideArea',
  texts: Shape[],
): Shape[] {
  const head = [...model.cols, ...model.rows].find((h) => h.id === key);
  const area = areaMark(model.areas, head?.area, 'body');
  if (area === undefined) return texts;
  const ground: Shape = {
    kind: 'rect',
    x: rect.x + INSET,
    y: rect.y + INSET,
    w: rect.w - 2 * INSET,
    h: rect.h - 2 * INSET,
    role,
  };
  return [{ kind: 'group', area, children: [ground, ...texts] }];
}

/** The legend's sample of an area: a small white box with the table's frame, painted like the heads of the area. */
export function areaSample(model: MatrixModel, area: Area, x: number, y: number): Shape[] {
  const box: Shape = { kind: 'rect', x, y: y - 9, w: 32, h: 18, role: 'sheet' };
  const mark = areaMark(model.areas, area.id, 'body');
  return mark === undefined ? [box] : [{ kind: 'group', area: mark, children: [box] }];
}
