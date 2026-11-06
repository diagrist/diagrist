import type { Point, Rect } from '@diagrist/core';
import type { PlacedGroup } from '../layout.js';
import type { Frames } from './frames.js';
import type { Placement } from './jogs.js';
import type { Link } from './links.js';
import type { LayeredFrame, LayeredSpec } from './spec.js';

/** Room between the head of a frame and a line passing it, unless the frame gives its own (`LayeredFrame.head`). */
const AIR = 12;

/** The room a line passing the head of `frame` keeps beside it. */
export const airOf = (frame: LayeredFrame | undefined): number => frame?.head.air ?? AIR;

const meets = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const holds = (a: Rect, b: Rect) => a.x <= b.x && a.y <= b.y && a.x + a.w >= b.x + b.w && a.y + a.h >= b.y + b.h;
const within = (r: Rect, p: Point) => p[0] >= r.x && p[0] <= r.x + r.w && p[1] >= r.y && p[1] <= r.y + r.h;

/** Whether a line that neither starts nor ends in `frame` runs through `strip` or on its outline. */
const passes = (lines: readonly { readonly points: readonly Point[] }[], frame: Rect, strip: Rect) =>
  lines.some(
    ({ points }) =>
      !within(frame, points[0] ?? [0, 0]) &&
      !within(frame, points.at(-1) ?? [0, 0]) &&
      points.slice(1).some((q, k) => {
        const p = points[k] ?? q;
        const [x0, x1, y0, y1] = [
          Math.min(p[0], q[0]),
          Math.max(p[0], q[0]),
          Math.min(p[1], q[1]),
          Math.max(p[1], q[1]),
        ];
        return x0 <= strip.x + strip.w && x1 >= strip.x && y0 < strip.y + strip.h && y1 > strip.y;
      }),
  );

/**
 * Frames whose head a line crosses grow to the left until the head stands its air beside the leftmost such line, unless
 * they would then reach a box or frame they do not hold, or a line that neither starts nor ends in them, which would
 * then run through the frame; frames around them grow along. Inner frames come last.
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
    const air = airOf(byId.get(g.id));
    const [x0, x1] = [g.rect.x, g.rect.x + head.width + air];
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
    const shift = g.rect.x - (Math.min(...xs) - head.width - air);
    if (shift <= 0) continue;
    const grown = { ...g.rect, x: g.rect.x - shift, w: g.rect.w + shift };
    const mine = new Set(out.filter((o) => holds(g.rect, o.rect)).map((o) => o.id));
    const foreignBoxes = [...boxes.values()].filter((b) => !holds(g.rect, b));
    const foreignFrames = out.filter((o) => o !== g && !mine.has(o.id) && !holds(o.rect, g.rect));
    if ([...foreignBoxes, ...foreignFrames.map((o) => o.rect)].some((r) => meets(r, grown))) continue;
    if (passes(lines, g.rect, { ...g.rect, x: grown.x, w: shift })) continue;
    const around = out.filter((o) => o !== g && holds(o.rect, g.rect));
    g.rect = grown;
    for (const o of around) {
      const x = Math.min(o.rect.x, grown.x - (byId.get(o.id)?.pad ?? 0));
      o.rect = { ...o.rect, x, w: o.rect.x + o.rect.w - x };
    }
  }
  return out;
}

/**
 * What a pixel of the empty strip a frame widened for its head keeps costs, against `scoreOf`: twice a pixel of
 * width, so a frame around its content wins over a line that much longer.
 */
const STRIP = 0.2;

/** What `clearOfHeads` works with: the links, the frames, and the placement's steps and price of the picture. */
export interface HeadWork {
  readonly links: readonly Link[];
  readonly frames: Frames;
  readonly settle: (x: Map<string, number>) => Placement;
  readonly place: () => Placement;
  readonly price: (p: Placement) => number;
}

/**
 * A placement in which no line entering a frame from above crosses its head, the cheapest by `price` of three: the
 * nodes such lines enter moved right past the head, what stands beyond them making room, where that leaves no head
 * crossed; the frames widened at the left (`Frames.widen`), so the frame keeps an empty strip below its head; and the
 * placement as it is, where every such line passes beside the head proper and only short of its air, which the frame
 * then takes from the left as far as nothing stands there (`clearHeads`). A widened or unchanged frame pays for its
 * strip (`STRIP`); on a tie the earlier wins.
 */
export function clearOfHeads(placement: Placement, w: HeadWork): Placement {
  const needsOf = (p: Placement) =>
    w.frames.heads(
      w.links.map((l) => ({ upper: l.upper, lower: l.lower, x: p.ports.top.get(l) ?? 0 })),
      p.flat,
    );
  const needs = needsOf(placement);
  if (needs.length === 0) return placement;
  const strip = STRIP * needs.reduce((sum, n) => sum + n.need, 0);
  const x = new Map(placement.x);
  for (const { need, nodes } of needs) for (const n of new Set(nodes)) x.set(n, (x.get(n) ?? 0) + need);
  const moved = w.settle(x);
  const priced = [{ p: moved, cost: needsOf(moved).length === 0 ? w.price(moved) : Number.POSITIVE_INFINITY }];
  const kept = needs.every((n) => n.need <= n.air) ? w.price(placement) + strip : Number.POSITIVE_INFINITY;
  w.frames.widen(needs);
  const widened = w.place();
  priced.push({ p: widened, cost: w.price(widened) + strip }, { p: placement, cost: kept });
  w.frames.widen(needs, -1);
  const best = priced.reduce((a, b) => (b.cost < a.cost ? b : a));
  if (best.p === widened) w.frames.widen(needs);
  return best.p;
}
