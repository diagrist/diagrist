import { textWidth } from '@diagrist/core';
import { bottom, type PlacedGroup, right } from '@diagrist/layout-grid';
import type { StateModel } from '../model.js';
import { STATE_FONTS as F, STATE as S } from './metrics.js';

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

/**
 * The regions of a composite state as the layout filled it with them, side by side or stacked: a separator where
 * two meet, across the state, and each name at the top left of its region.
 */
export function regionArt(frame: PlacedGroup, m: StateModel, regions: readonly PlacedGroup[]): RegionArt {
  const own = m.diagram.vertices.filter((v) => v.kind === 'region' && v.parent === frame.id);
  const placed = own
    .flatMap((v) => {
      const at = regions.find((r) => r.id === v.id);
      return at ? [{ v, rect: at.rect }] : [];
    })
    .sort((a, b) => a.rect.x - b.rect.x || a.rect.y - b.rect.y);
  const separators = placed.slice(1).map(({ rect }, i) => {
    const before = placed[i]?.rect ?? rect;
    return Math.abs(right(before) - rect.x) < 1
      ? { x1: rect.x, y1: rect.y, x2: rect.x, y2: bottom(rect) }
      : { x1: rect.x, y1: rect.y, x2: right(rect), y2: rect.y };
  });
  const names = placed.flatMap(({ v, rect }) =>
    v.label ? [{ text: v.label, x: rect.x + S.padX, y: rect.y + S.regionNameH - 4 }] : [],
  );
  return { separators, names };
}
