import { type Rect, textWidth } from '@diagrist/core';
import type { EdgeLabel, GridLayout, Route, Side } from '@diagrist/layout-grid';
import type { StateModel } from '../../model.js';
import { STATE_FONTS as F, STATE as S } from '../metrics.js';
import { borderOf, borderSide, hostOf, segmentHits } from './geometry.js';

/** The name of a point beside its circle. */
export interface PointName {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'end';
}

/** Places of the name outside beside the circle; the first is the default. */
function spots(rect: Rect, side: Side): Omit<PointName, 'text'>[] {
  const gap = S.pseudoLabelGap;
  const [left, right] = [rect.x - gap, rect.x + rect.w + gap];
  const [above, below] = [rect.y - gap / 2, rect.y + rect.h + F.label.size];
  const choices: Record<Side, Omit<PointName, 'text'>[]> = {
    top: [
      { x: right, y: above, anchor: 'start' },
      { x: left, y: above, anchor: 'end' },
    ],
    bottom: [
      { x: right, y: below, anchor: 'start' },
      { x: left, y: below, anchor: 'end' },
    ],
    left: [
      { x: left, y: above, anchor: 'end' },
      { x: left, y: below, anchor: 'end' },
    ],
    right: [
      { x: right, y: above, anchor: 'start' },
      { x: right, y: below, anchor: 'start' },
    ],
  };
  return choices[side];
}

const overlaps = (a: Rect, b: Rect, pad: number) =>
  a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad;

/**
 * Names of entry and exit points outside beside their circle, so they are not taken for the inside of the state. On a
 * line, a label or the name of another point, a name moves to the other side of the circle when less is in its way.
 */
export function pointNames(
  m: StateModel,
  grid: GridLayout,
  routes: readonly Route[],
  labels: readonly EdgeLabel[],
): Map<string, PointName> {
  const out = new Map<string, PointName>();
  const named: Rect[] = [];
  const size = F.label.size;
  for (const p of grid.nodes) {
    const label = m.vertices.get(p.id)?.label;
    if ((!borderOf(m, p.id) && !hostOf(m, p.id)) || !label) continue;
    const side = borderSide(m, p.id, grid);
    if (!side) continue;
    const width = textWidth(label, F.label);
    const box = (s: Omit<PointName, 'text'>): Rect => ({
      x: s.anchor === 'start' ? s.x : s.x - width,
      y: s.y - size,
      w: width,
      h: size + 2,
    });
    const cost = (s: Omit<PointName, 'text'>) => {
      const b = box(s);
      const lines = routes.reduce(
        (n, r) =>
          n + r.points.slice(1).filter((q, i) => segmentHits(r.points[i] ?? q, q, b, Math.max(2, size / 3))).length,
        0,
      );
      const texts = labels.filter((t) => overlaps(t.box, b, 2)).length;
      const others = grid.nodes.filter((o) => o.id !== p.id && overlaps(o.rect, b, 2)).length;
      return lines + texts + others + named.filter((n) => overlaps(n, b, 2)).length;
    };
    const [first, ...rest] = spots(p.rect, side);
    if (!first) continue;
    const best = rest.reduce((a, b) => (cost(b) < cost(a) ? b : a), first);
    named.push(box(best));
    out.set(p.id, { text: label, ...best });
  }
  return out;
}
