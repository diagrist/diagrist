import type { Rect } from '@diagrist/core';
import type { SequenceModel } from '../model/types.js';
import type { Rows } from './rows.js';
import type { SeqCtx } from './text.js';

export interface Bar {
  readonly lifeline: string;
  readonly level: number;
  readonly rect: Rect;
}

/** Up to this distance a height still counts as covered by a bar (rounding). */
const EPS = 0.5;

/**
 * Activation bars as rectangles. A call starts at the height of its arrow and ends just below the reply; a
 * self call hangs a short bar one level deeper on the return of its loop.
 */
export function bars(m: SequenceModel, r: Rows, xs: ReadonlyMap<string, number>, c: SeqCtx): Bar[] {
  const s = c.s;
  /** A bar ending at a self call reaches below its short bar; a sloped arrow counts where it arrives. */
  const at = (k: number, fallback: number, lifeline: string) => {
    const e = m.diagram.events[k];
    const back = e?.type === 'message' && e.kind === 'sync' ? r.back.get(k) : undefined;
    const arrive = e?.type === 'message' && e.to === lifeline ? r.arrive.get(k) : undefined;
    return back === undefined ? (arrive ?? r.y[k] ?? fallback) : back + s.barMinH - s.barOverhang;
  };
  return m.activations.map((a) => {
    const cx = xs.get(a.lifeline) ?? 0;
    const x = cx - s.barW / 2 + a.level * s.barLevel;
    const back = r.back.get(a.from);
    if (a.cause === 'self' && back !== undefined) {
      const top = back - s.barOverhang;
      const end = a.to > a.from ? at(a.to, top, a.lifeline) + s.barOverhang : top + s.barMinH;
      return { lifeline: a.lifeline, level: a.level, rect: { x, y: top, w: s.barW, h: end - top } };
    }
    const top = (a.cause === 'create' ? r.headEnd.get(a.from) : undefined) ?? r.arrive.get(a.from) ?? r.y[a.from] ?? 0;
    const end = Math.max(at(a.to, top, a.lifeline) + s.barOverhang, top + s.barMinH);
    return { lifeline: a.lifeline, level: a.level, rect: { x, y: top, w: s.barW, h: end - top } };
  });
}

/** Where a message docks: at the edge of the deepest bar covering height `y`, otherwise on the lifeline. */
export function dock(all: readonly Bar[], lifeline: string, x: number, y: number, side: 'left' | 'right'): number {
  let best: Bar | undefined;
  for (const b of all)
    if (b.lifeline === lifeline && b.rect.y - EPS <= y && y <= b.rect.y + b.rect.h + EPS)
      if (!best || b.level > best.level) best = b;
  if (!best) return x;
  return side === 'right' ? best.rect.x + best.rect.w : best.rect.x;
}
