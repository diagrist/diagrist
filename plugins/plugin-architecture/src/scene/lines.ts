import type { Shape } from '@diagrist/core';
import type { Spot } from '../layout/art-types.js';
import type { ArchNode } from '../model/types.js';

/** The indented lines of an element at their spots, in the `description` font, centred on them when `middle`. */
export const lineShapes = (n: ArchNode, spots: readonly Spot[], middle: boolean): Shape[] =>
  n.lines.flatMap((text, i): Shape[] => {
    const at = spots[i];
    if (!at) return [];
    return [{ kind: 'text', ...at, text, role: 'entry', font: 'description', ...(middle ? { anchor: 'middle' } : {}) }];
  });
