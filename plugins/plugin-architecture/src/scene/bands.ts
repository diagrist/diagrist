import type { Shape } from '@diagrist/core';
import type { BandSheet } from '../layout/bands/index.js';

/** The band sheet under the picture: grey heads with their texts, and the dotted separators between columns. */
export const bandShapes = (sheet: BandSheet): Shape[] => [
  ...sheet.heads.map((r): Shape => ({ kind: 'rect', ...r, role: 'bandHead' })),
  ...sheet.texts.map((t): Shape => ({ kind: 'text', ...t })),
  ...sheet.separators.map((s): Shape => ({ kind: 'line', ...s, role: 'separator' })),
];
