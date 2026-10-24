import type { Rect } from '@diagrist/core';
import type { GridLayout } from '@diagrist/layout-grid';
import type { StateModel } from '../../model.js';
import { endBox, foreignFrames } from '../ends.js';

/** What the tidying of routes knows per route index: its ends, the lines of its label, and the layout. */
export interface RouteContext {
  readonly m: StateModel;
  readonly grid: GridLayout;
  readonly ends: readonly { readonly from: string; readonly to: string; readonly emph?: boolean }[];
  readonly lines: readonly (readonly string[])[];
}

/** Rectangles a changed route of index `i` must not touch: foreign nodes and the frames of foreign states. */
export function blocking(c: RouteContext, i: number): Rect[] {
  const e = c.ends[i];
  if (!e) return [];
  const own = new Set([endBox(e.from, c.grid)?.id, endBox(e.to, c.grid)?.id]);
  return [
    ...c.grid.nodes.filter((n) => !own.has(n.id)).map((n) => n.rect),
    ...foreignFrames(c.m, e.from, e.to, c.grid),
  ];
}
