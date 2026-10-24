import type { Placed } from '@diagrist/core';
import type { GridLayout } from '@diagrist/layout-grid';

/**
 * A label or note without a frame of its own belongs into the innermost frame around it, where the layout put it: a
 * multiplicity at a class inside its package, a note above it, the label of a transition to a point on its own
 * state. One lying on a frame line stays without.
 */
export function homed(p: Placed, grid: GridLayout): Placed {
  if (p.within !== undefined || (p.kind === 'box' && !p.key.includes('.note.'))) return p;
  const r = p.rect;
  const around = grid.groups.filter(
    (g) => r.x >= g.rect.x && r.y >= g.rect.y && r.x + r.w <= g.rect.x + g.rect.w && r.y + r.h <= g.rect.y + g.rect.h,
  );
  const home = around.at(-1);
  return home ? { ...p, within: home.id } : p;
}
