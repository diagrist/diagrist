import type { Shape } from '@diagrist/core';
import type { Sheet } from '../layout/sheet.js';

/** Hairlines and texts of the margin notes and the legend sentences. */
export const sheetShapes = (sheet: Sheet): Shape[] => [
  ...sheet.rules.map((r): Shape => ({ kind: 'line', ...r, role: 'marginRule' })),
  ...sheet.texts.map((t): Shape => ({ kind: 'text', x: t.x, y: t.y, text: t.text, role: t.role, font: 'label' })),
];
