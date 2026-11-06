import type { Placed, Rect } from '@diagrist/core';
import type { GridLayout } from '@diagrist/layout-grid';
import { type Mark, markRect } from './marks.js';

const holds = (outer: Rect, r: Rect): boolean =>
  r.x >= outer.x && r.y >= outer.y && r.x + r.w <= outer.x + outer.w && r.y + r.h <= outer.y + outer.h;

/**
 * Decision marks at nodes for the kernel's placement check, as texts keyed `<node>.mark` inside the smallest frame
 * that holds them; marks inside a box (`marks: inside`) are part of the box and left out.
 */
export function nodeMarkTexts(marks: readonly Mark[], owners: ReadonlyMap<string, string>, grid: GridLayout): Placed[] {
  return marks.flatMap((mark): Placed[] => {
    const owner = owners.get(mark.id);
    const rect = markRect(mark);
    if (mark.route !== undefined || owner === undefined) return [];
    if (grid.nodes.some((n) => n.id === owner && holds(n.rect, rect))) return [];
    const frame = grid.groups
      .filter((g) => holds(g.rect, rect))
      .sort((a, b) => a.rect.w * a.rect.h - b.rect.w * b.rect.h)[0];
    return [{ key: `${owner}.mark`, kind: 'text', rect, ...(frame ? { within: frame.id } : {}) }];
  });
}
