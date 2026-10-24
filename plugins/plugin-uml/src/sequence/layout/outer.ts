import type { Rect } from '@diagrist/core';
import { tagShapes } from './boxes.js';
import { snapToFrame } from './gates.js';
import type { SeqCtx } from './text.js';
import type { SeqMessageArt, SeqShape } from './types.js';

export interface Outer {
  readonly shapes: readonly SeqShape[];
  readonly messages: readonly SeqMessageArt[];
}

/**
 * Frame around the whole interaction (UML 2.5.1, 17.2): a rectangle around heads, lifelines and everything
 * beside them, with the tag `sd Name` at the top left. Gates are where messages touch it; gates on fragments
 * stay at their frames.
 */
export function outerFrame(
  name: string,
  extent: readonly [number, number],
  bottom: number,
  messages: readonly SeqMessageArt[],
  c: SeqCtx,
): Outer {
  const s = c.s;
  const top = s.headTop - s.framePadTop / 2;
  const rect: Rect = {
    x: extent[0] - s.framePadX,
    y: top,
    w: extent[1] - extent[0] + 2 * s.framePadX,
    h: bottom + s.framePadBottom - top,
  };
  return {
    shapes: [{ kind: 'rect', rect, role: 'frame' }, ...tagShapes(`sd ${name}`, rect.x, rect.y, c)],
    messages: messages.map((m) => (m.via === undefined ? snapToFrame(m, rect, c, true) : m)),
  };
}
