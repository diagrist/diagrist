import { type Rect, type Shape, textWidth } from '@diagrist/core';
import { headPath, tabbedFrame } from '../../shared/cards.js';
import { STATE_FONTS as F, STATE as S } from '../layout/metrics.js';

/** Width of the name tab of a state with regions: its name with indent on both sides. */
export const nameTabWidth = (label: string): number => textWidth(label, F.name) + 2 * S.padX;

/**
 * A state with orthogonal regions as UML draws it (UML 2.5.1, 14.2.4, Figure 14.5): the name in a tab resting on the
 * outside of its top side at the left, the body below with its regions, so the lines from a fork into the regions
 * pass beside the tab and cross no name. The tab is `S.headH` high, the top `r.y` of the rectangle is the tab's.
 */
export function tabbedState(r: Rect, label: string, role: string): Shape[] {
  const tab = { x: r.x, y: r.y, w: Math.min(r.w, nameTabWidth(label)), h: S.headH };
  const body = { x: r.x, y: r.y + tab.h, w: r.w, h: r.h - tab.h };
  return [
    { kind: 'path', d: tabbedFrame(body, S.radius), role },
    { kind: 'path', d: headPath(tab, tab.h, S.radius / 2, false), role },
    {
      kind: 'text',
      x: r.x + S.padX,
      y: r.y + S.headH / 2 + S.labelDy,
      text: label,
      role: 'name',
      font: 'name',
      anchor: 'start',
    },
  ];
}
