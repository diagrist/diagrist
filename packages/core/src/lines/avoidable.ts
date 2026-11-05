import type { Rect } from '../geometry.js';
import { segmentMeetsRect } from '../segment.js';
import { rectsOf } from './index.js';
import { segmentsOf } from './lines.js';
import type { LineInput } from './types.js';

/** A straight line needs its ends this far apart from the corners of both boxes, so the shared stretch must be wider. */
const ROOM = 24;
/** Steps the search for a free straight line takes along the shared stretch. */
const STEP = 8;

/** The stretch two boxes share across `axis` (0: side by side in x, so a vertical line), if they stand apart along it. */
function shared(a: Rect, b: Rect, axis: 0 | 1): [number, number] | undefined {
  const [pos, size] = axis === 0 ? (['x', 'w'] as const) : (['y', 'h'] as const);
  const [along, alongSize] = axis === 0 ? (['y', 'h'] as const) : (['x', 'w'] as const);
  const apart = a[along] + a[alongSize] <= b[along] || b[along] + b[alongSize] <= a[along];
  const lo = Math.max(a[pos], b[pos]) + ROOM / 2;
  const hi = Math.min(a[pos] + a[size], b[pos] + b[size]) - ROOM / 2;
  return apart && lo <= hi ? [lo, hi] : undefined;
}

/**
 * Lines that bend although a straight line could join their boxes: the two boxes stand apart, share a stretch of
 * their sides wide enough for a line clear of the corners, and a straight line somewhere in it meets no other box.
 * Lines of a bundle bend on purpose along their trunk and do not count. A layout that moves a box or a port could
 * spare each of these bends; the stress budgets count them so they do not come back.
 */
export function avoidableBends(input: LineInput): number {
  const rectOf = rectsOf(input);
  const others = (from: string, to: string) =>
    input.nodes.filter((n) => n.id !== from && n.id !== to && n.owner === undefined).map((n) => n.rect);
  return input.routes.filter((r) => {
    if ((r.bundles ?? []).length > 0 || segmentsOf(r).length < 2) return false;
    const [a, b] = [rectOf(r.from), rectOf(r.to)];
    if (a === undefined || b === undefined || r.from === r.to) return false;
    return ([0, 1] as const).some((axis) => {
      const stretch = shared(a, b, axis);
      if (stretch === undefined) return false;
      const [near, far] =
        axis === 0
          ? [Math.min(a.y + a.h, b.y + b.h), Math.max(a.y, b.y)]
          : [Math.min(a.x + a.w, b.x + b.w), Math.max(a.x, b.x)];
      for (let v = stretch[0]; v <= stretch[1]; v += STEP) {
        const [p, q] = axis === 0 ? [[v, near] as const, [v, far] as const] : [[near, v] as const, [far, v] as const];
        if (!others(r.from, r.to).some((o) => segmentMeetsRect(p, q, o, 0))) return true;
      }
      return false;
    });
  }).length;
}
