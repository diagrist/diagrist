import { domId, type Point, type Rect, type Shape, textWidth } from '@diagrist/core';
import type { PlacedGroup } from '@diagrist/layout-grid';
import { stateLines } from '../layout/box.js';
import type { StateLayout } from '../layout/index.js';
import { STATE_FONTS as F, STATE as S } from '../layout/metrics.js';
import { regionArt } from '../layout/regions.js';
import type { StateModel } from '../model.js';

/**
 * The middle of the name in the name field: centred while no line crosses the field there, as from a fork into the
 * regions; else the free gap between the lines nearest to the middle.
 */
function nameCentre(rect: Rect, lines: readonly (readonly Point[])[], width: number): number {
  const xs = lines.flatMap((p) =>
    p.slice(1).flatMap((q, i) => {
      const a = p[i] ?? q;
      const crosses = a[0] === q[0] && Math.min(a[1], q[1]) < rect.y + S.headH && Math.max(a[1], q[1]) > rect.y + 1;
      return crosses && a[0] > rect.x && a[0] < rect.x + rect.w ? [a[0]] : [];
    }),
  );
  const half = width / 2 + 8;
  const mid = rect.x + rect.w / 2;
  if (xs.every((x) => Math.abs(x - mid) > half)) return mid;
  const cuts = [rect.x, ...xs.sort((a, b) => a - b), rect.x + rect.w];
  const gaps = cuts.slice(1).flatMap((b, i) => {
    const a = cuts[i] ?? b;
    return b - a >= 2 * half ? [(b + a) / 2] : [];
  });
  return gaps.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0] ?? mid;
}

/**
 * A composite state in its group `group-<id>`: a rounded box like a simple state, the name field on top, below it the
 * compartment with behaviour, then the substates; regions separated by dashed lines with their names at the top left.
 * In the card look a toned area.
 */
export function frameShape(g: PlacedGroup, m: StateModel, l: StateLayout): Shape {
  const v = m.vertices.get(g.id);
  const r = g.rect;
  const cards = m.diagram.look === 'cards';
  const tint = `tint-${v?.tone ?? 'slate'}`;
  const lines = v ? stateLines(m, v) : [];
  const rule = (y: number): Shape => ({
    kind: 'line',
    x1: r.x,
    y1: y,
    x2: r.x + r.w,
    y2: y,
    role: cards ? tint : 'divider',
  });
  const fach = lines.length ? S.headH + 2 * S.sectionPad + lines.length * S.lineH : S.headH;
  const label = v?.label ?? g.id;
  const x = nameCentre(
    r,
    l.routes.map((x) => x.points),
    textWidth(label, F.name),
  );
  const regions = regionArt(g, m, l.grid, l.ends, l.labels);
  return {
    kind: 'group',
    id: domId.group(g.id),
    children: [
      { kind: 'rect', ...r, rx: S.radius, role: v?.emph ? 'boxEmph' : cards ? tint : 'box' },
      { kind: 'text', x, y: r.y + S.headH / 2 + S.labelDy, text: label, role: 'name', font: 'name', anchor: 'middle' },
      rule(r.y + S.headH),
      ...(lines.length ? [rule(r.y + fach)] : []),
      ...lines.map(
        (text, i): Shape => ({
          kind: 'text',
          x: r.x + S.padX,
          y: r.y + S.headH + S.sectionPad + i * S.lineH + F.member.size + 1,
          text,
          role: 'member',
          font: 'member',
          anchor: 'start',
        }),
      ),
      ...regions.separators.map((d): Shape => ({ kind: 'line', ...d, role: 'separator' })),
      ...regions.names.map((t): Shape => ({ kind: 'text', ...t, role: 'plainLabel', font: 'label', anchor: 'start' })),
    ],
  };
}
