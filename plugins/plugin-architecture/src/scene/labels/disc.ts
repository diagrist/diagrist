import type { Shape } from '@diagrist/core';
import { NUMBER_SIZE } from '../../layout/marks.js';

const BADGE_R = NUMBER_SIZE.disc.w / 2;
const BADGE_DY = 3.3;

/**
 * A flow number as its digit in a small disc (`numbers.form: disc`), centred on (x, y), in the roles of the accent
 * flow when it belongs to one.
 */
export const discShapes = (n: number, x: number, y: number, accent: boolean): Shape[] => [
  { kind: 'circle', cx: x, cy: y, r: BADGE_R, role: accent ? 'badgeAccent' : 'badge' },
  {
    kind: 'text',
    x,
    y: y + BADGE_DY,
    text: String(n),
    role: accent ? 'badgeTextAccent' : 'badgeText',
    font: 'badge',
    anchor: 'middle',
  },
];
