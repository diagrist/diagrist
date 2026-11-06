import type { Rect } from '@diagrist/core';
import { cx } from '@diagrist/layout-grid';
import type { ActivityNode } from '../diagram.js';
import type { Graph } from './graph.js';
import { ACT } from './metrics.js';

/** A text with its anchor, as the scene draws it. */
export interface ActivityText {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'middle' | 'end';
}

/** An interruptible or expansion region in the picture: a dashed, rounded frame around its members. */
export interface RegionArt {
  readonly id: string;
  readonly rect: Rect;
  readonly rx: number;
  readonly members: readonly string[];
  /** Name of the region; `name` is where it stands, if there is room (`nameRegions`). */
  readonly label?: string;
  readonly name?: ActivityText;
  /** More lines of the name, when it stands apart from the keyword or wraps. */
  readonly more?: readonly ActivityText[];
  /** Expansion region: its mode as keyword, such as `«parallel»`, before the name. */
  readonly keyword?: string;
}

/** Box of a member with its side text and the pins that reach beyond its edge. */
export function memberBox(n: ActivityNode, r: Rect, e: { readonly left: number; readonly right: number }): Rect {
  const [left, right] = [Math.max(r.w / 2, e.left), Math.max(r.w / 2, e.right)];
  const up = n.inputs.length ? ACT.pin : 0;
  return { x: cx(r) - left, y: r.y - up, w: left + right, h: r.h + up + (n.outputs.length ? ACT.pin : 0) };
}

/**
 * A frame per interruptible region as the layout placed it around its members, with a band for its name at the top
 * of a named one.
 */
export function regionArt(g: Graph, frames: ReadonlyMap<string, Rect>): RegionArt[] {
  return g.regions.flatMap((region) => {
    const rect = frames.get(region.id);
    if (!rect) return [];
    return [
      {
        id: region.id,
        rect,
        rx: ACT.regionRx,
        members: g.nodes.filter((n) => n.interruptible === region.id).map((n) => n.id),
        ...(region.label ? { label: region.label } : {}),
      },
    ];
  });
}
