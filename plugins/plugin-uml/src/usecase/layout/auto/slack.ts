import type { Rect } from '@diagrist/core';
import type { UseCaseModel } from '../../model.js';
import { CASE_GAP } from '../graph.js';
import type { Laid } from '../laid.js';

/**
 * Whether packing could close a gap in a laid out picture: two use cases of one subject, one above the other in a
 * column, further apart than `CASE_GAP`, with no other use case of the subject reaching into the band between. A cheap
 * test before the packed layout, which decides for itself what moves; without such a gap it would move nothing.
 */
export function slack(m: UseCaseModel, laid: Laid): boolean {
  const rects = new Map(laid.layout.nodes.map((n) => [n.id, n.rect]));
  return m.diagram.subjects.some((s) => {
    const own = m.diagram.cases.flatMap((u) => (u.subject === s.id ? (rects.get(u.id) ?? []) : []));
    return own.some((a) =>
      own.some((b) => {
        const gap = b.y - (a.y + a.h);
        if (gap <= CASE_GAP + 0.5 || a.x >= b.x + b.w || b.x >= a.x + a.w) return false;
        const into = (r: Rect) => r !== a && r !== b && r.y < b.y - CASE_GAP && r.y + r.h > a.y + a.h + CASE_GAP;
        return !own.some(into);
      }),
    );
  });
}
