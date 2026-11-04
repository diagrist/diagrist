import type { Rect } from '@diagrist/core';
import type { EdgeLabel } from '../label/types.js';
import type { Hub } from './spec.js';

/** The frame around the core of a hub picture, and its head. */
export interface CoreFrame {
  readonly rect: Rect;
  readonly head: EdgeLabel;
}

/** The frame around the boxes of the core, `pad` away from them, with its head above its top left corner. */
export function frameOf(hub: Hub, boxes: readonly Rect[], gap: number): CoreFrame | undefined {
  if (boxes.length === 0) return undefined;
  const x = Math.min(...boxes.map((b) => b.x)) - hub.pad;
  const y = Math.min(...boxes.map((b) => b.y)) - hub.pad;
  const rect = {
    x,
    y,
    w: Math.max(...boxes.map((b) => b.x + b.w)) + hub.pad - x,
    h: Math.max(...boxes.map((b) => b.y + b.h)) + hub.pad - y,
  };
  const top = y - gap - hub.head.size - 2;
  const box = { x, y: top, w: hub.head.width, h: hub.head.size + 2 };
  return {
    rect,
    head: { text: hub.head.text, x, y: top + hub.head.size, anchor: 'start', box, route: -1, part: 'name' },
  };
}
