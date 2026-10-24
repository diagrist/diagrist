import type { Rect } from '@diagrist/core';
import { type GridLayout, overlaps } from '@diagrist/layout-grid';
import type { StateModel } from '../model.js';
import { STATE as S } from './metrics.js';

/**
 * Fork and join bars reach over all their neighbours, so every branch leaves or enters straight: from the middle of
 * the outermost neighbour to the middle of the other, plus overhang. A bar that would touch a foreign node stays.
 */
export function stretchBars(grid: GridLayout, m: StateModel): GridLayout {
  const down = m.diagram.direction === 'down';
  const nodes = [...grid.nodes];
  nodes.forEach((p, i) => {
    const kind = m.kind(p.id);
    if (kind !== 'fork' && kind !== 'join') return;
    const peers = m.diagram.transitions
      .flatMap((t) => (t.from === p.id ? [t.to] : t.to === p.id ? [t.from] : []))
      .flatMap((id) => nodes.find((n) => n.id === id)?.rect ?? []);
    if (peers.length < 2) return;
    const r = p.rect;
    const centres = peers.map((q) => (down ? q.x + q.w / 2 : q.y + q.h / 2));
    const over = S.barOverhang;
    const lo = Math.min(...centres, (down ? r.x : r.y) + over) - over;
    const hi = Math.max(...centres, (down ? r.x + r.w : r.y + r.h) - over) + over;
    const rect: Rect = down ? { ...r, x: lo, w: hi - lo } : { ...r, y: lo, h: hi - lo };
    if (!nodes.some((o) => o.id !== p.id && overlaps(rect, o.rect, 4))) nodes[i] = { ...p, rect };
  });
  return { ...grid, nodes };
}
