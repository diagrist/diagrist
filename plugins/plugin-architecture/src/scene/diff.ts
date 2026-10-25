import type { Shape } from '@diagrist/core';
import { CHANGE_SIGN, type Change } from '../layout/diff.js';

const TAG = { w: 18, h: 16, rx: 4, dy: 4 } as const;

const TAG_ROLE: Readonly<Record<Change, string>> = {
  added: 'diffTagAdded',
  removed: 'diffTagRemoved',
  changed: 'diffTagChanged',
};

/** The tag of a change, its sign in a small box, centred on (x, y): at the corner of a box and in the legend. */
export function changeTagShapes(change: Change, x: number, y: number): Shape[] {
  return [
    { kind: 'rect', x: x - TAG.w / 2, y: y - TAG.h / 2, w: TAG.w, h: TAG.h, rx: TAG.rx, role: TAG_ROLE[change] },
    {
      kind: 'text',
      x,
      y: y + TAG.dy,
      text: CHANGE_SIGN[change],
      role: `${TAG_ROLE[change]}Text`,
      font: 'badge',
      anchor: 'middle',
    },
  ];
}
