import type { Shape } from '@diagrist/core';
import { iconStroke } from '../icons/index.js';

/** The role of an icon by how it is drawn (lines or filled) and its colour. */
export const iconRole = (icon: string, color: 'ink' | 'muted' | 'white'): string => `icon-${iconStroke(icon)}-${color}`;

/** An icon in the square at (x, y) of side `size`, drawn as large as the look measures it. */
export function iconShape(icon: string, at: { x: number; y: number; size: number }, role: string): Shape {
  return { kind: 'icon', icon, x: at.x, y: at.y, size: at.size, role };
}
