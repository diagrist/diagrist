import { type Rect, textWidth } from '@diagrist/core';
import { bottom, type EdgeLabel, type GridLayout, type PlacedGroup, right } from '@diagrist/layout-grid';
import { regionUnder, type StateModel } from '../model.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';
import { borderOf } from './points/geometry.js';
import { compositeHead } from './spec.js';

/** The orthogonal regions of a composite state: dashed separators and names. */
export interface RegionArt {
  readonly separators: readonly {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  }[];
  readonly names: readonly { readonly text: string; readonly x: number; readonly y: number }[];
}

/** Width the name of a region needs: the text with indent on both sides. */
export const regionNameRoom = (label: string | undefined): number =>
  label ? textWidth(label, F.label) + 2 * S.padX : 0;

const union = (rs: readonly Rect[]): Rect => {
  const x = Math.min(...rs.map((r) => r.x));
  const y = Math.min(...rs.map((r) => r.y));
  return { x, y, w: Math.max(...rs.map(right)) - x, h: Math.max(...rs.map(bottom)) - y };
};

/**
 * Regions stand across the flow side by side. Each separator lies in the middle between the content of two
 * neighbours (vertices, frames and labels of their inner transitions), never in the name of the left one, and reaches
 * from the compartment to the border. The name stands at the top left of its region.
 */
export function regionArt(
  frame: PlacedGroup,
  m: StateModel,
  grid: GridLayout,
  ends: readonly { readonly from: string; readonly to: string }[],
  labels: readonly EdgeLabel[],
): RegionArt {
  const regions = m.diagram.vertices.filter((v) => v.kind === 'region' && v.parent === frame.id);
  if (!regions.length) return { separators: [], names: [] };
  const down = m.diagram.direction === 'down';
  const rect = frame.rect;
  const content = (region: string): Rect | undefined => {
    const own = (id: string | undefined) => id !== undefined && regionUnder(m, id, frame.id) === region;
    const rects = [
      ...grid.nodes.filter((n) => own(n.id) && !borderOf(m, n.id)).map((n) => n.rect),
      ...grid.groups.filter((g) => own(g.id)).map((g) => g.rect),
    ];
    const inner = new Set(ends.flatMap((e, i) => (own(e.from) && own(e.to) ? [i] : [])));
    rects.push(...labels.filter((l) => inner.has(l.route)).map((l) => l.box));
    return rects.length ? union(rects) : undefined;
  };
  const placed = regions
    .flatMap((r) => {
      const area = content(r.id);
      return area ? [{ region: r, area }] : [];
    })
    .sort((a, b) => (down ? a.area.x - b.area.x : a.area.y - b.area.y));
  const top = rect.y + compositeHead(m, frame.id);
  const cuts: number[] = [];
  placed.slice(1).forEach((b, i) => {
    const a = placed[i]?.area;
    if (!a) return;
    const start = i === 0 ? rect.x : (cuts[i - 1] ?? rect.x);
    const need = regionNameRoom(placed[i]?.region.label);
    cuts.push(
      Math.round(
        down ? Math.min(Math.max((right(a) + b.area.x) / 2, start + need), b.area.x - 2) : (bottom(a) + b.area.y) / 2,
      ),
    );
  });
  const separators = cuts.map((c) =>
    down ? { x1: c, y1: top, x2: c, y2: bottom(rect) } : { x1: rect.x, y1: c, x2: right(rect), y2: c },
  );
  const names = placed.flatMap(({ region }, i) => {
    if (!region.label) return [];
    const start = i === 0 ? (down ? rect.x : top) : (cuts[i - 1] ?? 0);
    return [{ text: region.label, x: (down ? start : rect.x) + S.padX, y: (down ? top : start) + S.regionNameH - 4 }];
  });
  return { separators, names };
}
