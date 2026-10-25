import { type Font, type Point, type Rect, textWidth } from '@diagrist/core';
import type { Spot } from './sheet/header.js';

/** A dashed note beside a target, with a tip to it: the box, the baseline of its text, and left foot, tip, right foot. */
export interface NoteGeometry {
  readonly rect: Rect;
  readonly at: Spot;
  readonly tail: readonly Point[];
}

/**
 * A one-line note on `target`: its left edge a little left of the target's right edge, above the target with the
 * tip down to its top edge, or below it with the tip up when `below`. `clear` lifts a note above by what sticks out
 * of the top edge, such as an icon on it, while the tip still reaches the edge. Measures follow the size of `font`
 * (10 px: pad 10, height 26, lift 22, tip base 14), and the note is as wide as its text in `font` and the pads.
 */
export function noteGeometry(
  target: Rect,
  text: string,
  font: Font,
  place: { readonly below?: boolean; readonly clear?: number } = {},
): NoteGeometry {
  const f = font.size;
  const pad = f;
  const height = Math.round(2.6 * f);
  const lift = Math.round(2.2 * f);
  const base = Math.round(1.4 * f);
  const w = textWidth(text, font) + 2 * pad;
  const right = target.x + target.w;
  const below = place.below === true;
  const top = target.y - (place.clear ?? 0);
  const rect = { x: right - base * 2, y: below ? target.y + target.h + lift : top - lift - height, w, h: height };
  const foot = rect.x + base;
  const edge = below ? rect.y : rect.y + height;
  const tip = below ? target.y + target.h : target.y;
  return {
    rect,
    at: { x: rect.x + pad, y: rect.y + height / 2 + f / 2 - 1 },
    tail: [
      [foot - base / 2, edge],
      [right - base * 3, tip],
      [foot + base / 2, edge],
    ],
  };
}
