import type { Shape } from '../scene.js';
import type { AreaMark } from './tones.js';

/**
 * The shapes with every group whose DOM id `marks` names marked with its area (ADR 0033), at any depth, so a kind
 * builds its scene as before and marks it afterwards. Without marks the shapes are returned as they are.
 */
export function markAreas(shapes: readonly Shape[], marks: ReadonlyMap<string, AreaMark>): Shape[] {
  if (marks.size === 0) return [...shapes];
  return shapes.map((shape): Shape => {
    if (shape.kind !== 'group') return shape;
    const area = shape.id === undefined ? undefined : marks.get(shape.id);
    const children = markAreas(shape.children, marks);
    return area === undefined ? { ...shape, children } : { ...shape, area, children };
  });
}
