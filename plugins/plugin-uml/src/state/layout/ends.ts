import type { Rect } from '@diagrist/core';
import type { GridLayout } from '@diagrist/layout-grid';
import { frameOf, type StateModel } from '../model.js';
import { borderOf } from './points/geometry.js';

/** The box of a transition end: its node, or the frame of a composite state. */
export interface EndBox {
  readonly id: string;
  readonly rect: Rect;
  readonly frame: boolean;
}

export function endBox(id: string, grid: GridLayout): EndBox | undefined {
  const node = grid.nodes.find((n) => n.id === id);
  if (node) return { id, rect: node.rect, frame: false };
  const group = grid.groups.find((g) => g.id === id);
  return group ? { id, rect: group.rect, frame: true } : undefined;
}

/** Frames an end lies in, innermost first; a frame as end itself first. */
function enclosing(m: StateModel, id: string): string[] {
  const first = m.composites.has(id) ? id : (borderOf(m, id) ?? frameOf(m, m.vertices.get(id)?.parent));
  const out: string[] = [];
  for (let g = first; g !== undefined && !out.includes(g); g = frameOf(m, m.vertices.get(g)?.parent)) out.push(g);
  return out;
}

/**
 * Composite states a transition has nothing to do with: neither end lies in them. Their whole frame is an obstacle,
 * so the line runs around them instead of through foreign areas.
 */
export function foreignFrames(m: StateModel, from: string, to: string, grid: GridLayout): Rect[] {
  const own = new Set([...enclosing(m, from), ...enclosing(m, to)]);
  return grid.groups.filter((g) => !own.has(g.id)).map((g) => g.rect);
}
