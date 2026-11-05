import type { Shape } from '@diagrist/core';
import { iconStroke } from '../icons/index.js';

/** The role of an icon by how it is drawn (lines or filled) and its colour. */
export const iconRole = (icon: string, color: 'ink' | 'muted' | 'white'): string => `icon-${iconStroke(icon)}-${color}`;

/** The square the icons are drawn in, in their own units. */
const UNITS = 24;

/**
 * An icon in the square at (x, y) of side `size`, drawn at the scale the predecessor wrote, rounded to a tenth, so
 * an icon of 22 is 21.6 wide and one of 18 is 19.2 (docs/burn-down.md).
 */
export function iconShape(icon: string, at: { x: number; y: number; size: number }, role: string): Shape {
  const size = UNITS * Number((at.size / UNITS).toFixed(1));
  return { kind: 'icon', icon, x: at.x, y: at.y, size, role };
}
