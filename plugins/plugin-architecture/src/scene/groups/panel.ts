import type { Shape } from '@diagrist/core';
import type { PlacedFrame } from '../../layout/index.js';
import type { Look } from '../../looks/look.js';
import { filledShapes } from '../nodes/block.js';

/** A frame of the form `panel`: an opaque filled area in its tone with a shadow, the title where the head says. */
export function panelShapes(f: PlacedFrame, look: Look): Shape[] {
  const { group: g, head } = f;
  const out = filledShapes(f.rect, g.tone ?? 'peach', look.metrics.frameRx);
  if (g.title)
    out.push({
      kind: 'text',
      ...head.title,
      text: g.title,
      role: 'blockTitle',
      font: 'heading',
      ...(head.titleAnchor ? { anchor: head.titleAnchor } : {}),
    });
  return out;
}
