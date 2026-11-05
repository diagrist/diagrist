import { DEFAULT_THRESHOLDS, type Point, type Rect } from '@diagrist/core';
import { segmentHitsRect } from '../geometry.js';
import type { EdgeLabel } from '../label/types.js';
import type { Hub } from './spec.js';

/** The frame around the core of a hub picture, and its head. */
export interface CoreFrame {
  readonly rect: Rect;
  readonly head: EdgeLabel;
}

/** Steps the head of the frame moves right by when a line passes its place. */
const STEP = 8;

/**
 * The frame around the boxes of the core, `pad` away from them, with its head above its top left corner, or further
 * right along the top where a line of `lines` would pass through it there.
 */
export function frameOf(
  hub: Hub,
  boxes: readonly Rect[],
  gap: number,
  lines: readonly (readonly Point[])[] = [],
): CoreFrame | undefined {
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
  const at = (left: number) => ({ x: left, y: top, w: hub.head.width, h: hub.head.size + 2 });
  const pad = DEFAULT_THRESHOLDS.clearance + 1;
  const clear = (b: Rect) =>
    !lines.some((l) => l.some((p, k) => k > 0 && segmentHitsRect(l[k - 1] as Point, p, b, pad)));
  const room = Math.max(0, Math.floor((rect.w - hub.head.width) / STEP));
  const left = Array.from({ length: room + 1 }, (_, k) => x + k * STEP).find((v) => clear(at(v))) ?? x;
  const box = at(left);
  return {
    rect,
    head: { text: hub.head.text, x: left, y: top + hub.head.size, anchor: 'start', box, route: -1, part: 'name' },
  };
}
