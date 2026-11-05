import type { Point, Rect } from '@diagrist/core';
import type { PlacedGroup } from '../layout.js';
import type { LayeredSpec } from './spec.js';

/** Room between the head of a frame and a line passing it. */
export const AIR = 12;

const meets = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const holds = (a: Rect, b: Rect) => a.x <= b.x && a.y <= b.y && a.x + a.w >= b.x + b.w && a.y + a.h >= b.y + b.h;

/**
 * Frames whose head a line crosses grow to the left until the head stands `AIR` beside the leftmost such line, unless
 * they would then reach a box or frame they do not hold; frames around them grow along. Inner frames come last.
 */
export function clearHeads(
  frames: readonly PlacedGroup[],
  spec: LayeredSpec,
  lines: readonly { readonly points: readonly Point[] }[],
  boxes: ReadonlyMap<string, Rect>,
): PlacedGroup[] {
  const out = frames.map((g) => ({ id: g.id, rect: { ...g.rect } }));
  const byId = new Map((spec.frames ?? []).map((f) => [f.id, f]));
  for (const g of [...out].reverse()) {
    const head = byId.get(g.id)?.head;
    if (head === undefined) continue;
    const [x0, x1] = [g.rect.x, g.rect.x + head.width + AIR];
    const [y0, y1] = [g.rect.y, g.rect.y + head.height];
    const xs = lines.flatMap((l) =>
      l.points.slice(1).flatMap((q, k) => {
        const p = l.points[k] ?? q;
        const crosses =
          p[0] === q[0] && p[0] > x0 && p[0] < x1 && Math.min(p[1], q[1]) < y1 && Math.max(p[1], q[1]) > y0;
        return crosses ? [p[0]] : [];
      }),
    );
    if (xs.length === 0) continue;
    const shift = g.rect.x - (Math.min(...xs) - head.width - AIR);
    if (shift <= 0) continue;
    const grown = { ...g.rect, x: g.rect.x - shift, w: g.rect.w + shift };
    const mine = new Set(out.filter((o) => holds(g.rect, o.rect)).map((o) => o.id));
    const foreignBoxes = [...boxes.values()].filter((b) => !holds(g.rect, b));
    const foreignFrames = out.filter((o) => o !== g && !mine.has(o.id) && !holds(o.rect, g.rect));
    if ([...foreignBoxes, ...foreignFrames.map((o) => o.rect)].some((r) => meets(r, grown))) continue;
    const around = out.filter((o) => o !== g && holds(o.rect, g.rect));
    g.rect = grown;
    for (const o of around) {
      const x = Math.min(o.rect.x, grown.x - (byId.get(o.id)?.pad ?? 0));
      o.rect = { ...o.rect, x, w: o.rect.x + o.rect.w - x };
    }
  }
  return out;
}
