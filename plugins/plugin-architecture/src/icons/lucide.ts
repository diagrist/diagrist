import { LUCIDE_A_L } from './lucide-a-l.js';
import { LUCIDE_M_Z } from './lucide-m-z.js';

/**
 * Lucide icons (ISC License, see `ICONS.md`), drawn with lines: path data in a square of 24 units, converted once
 * from the markup the predecessor generated (rectangles, circles, ellipses, lines and polylines as paths).
 */
export const LUCIDE: Readonly<Record<string, readonly string[]>> = { ...LUCIDE_A_L, ...LUCIDE_M_Z };
