import type { Extent } from './columns.js';
import { type Graph, isHandlerFlow } from './graph.js';
import { ACT, SIZE, widthOf } from './metrics.js';
import type { ActivityRanks } from './rank.js';
import type { ActivitySize } from './size.js';

/** Distance from which an edge leaves a diamond at its side (as in `ports`). */
const SIDEWAYS = 4;

/** Distance of two pins on one side: name, air, square and air. */
export const SIDE_PIN_SLOT: number = SIZE.label + 2 * ACT.pinGap + ACT.pin;

/**
 * Height for `n` pins below each other on one side: the first may stand in the middle, where the bolt from the same
 * layer arrives straight, the others below it. A single pin needs none.
 */
const sidePinsHeight = (n: number): number => (n < 2 ? 0 : 2 * ((n - 1) * SIDE_PIN_SLOT + ACT.pinGap + ACT.pin / 2));

/**
 * Room for the exception type beside the handler pin: on the side the bolt comes from, as wide as the name with pin
 * and bolt. Half the `span` stays symmetric for the slots of the lane. When several bolts come from one side, their
 * pins stand below each other and the handler grows so that every pin has its name above it.
 */
export function handlerSizes(
  g: Graph,
  sizes: ReadonlyMap<string, ActivitySize>,
  ranks: ActivityRanks,
): Map<string, ActivitySize> {
  const out = new Map(sizes);
  const room = new Map<string, { left: number; right: number; nl: number; nr: number }>();
  for (const f of g.flows.filter(isHandlerFlow)) {
    if (!out.has(f.to)) continue;
    const w = widthOf.label(f.exception) + ACT.pin + ACT.pinGap + ACT.bolt;
    const fromLeft = (ranks.laneOf.get(f.to) ?? 0) >= (ranks.laneOf.get(f.from) ?? 0);
    const r = room.get(f.to) ?? { left: 0, right: 0, nl: 0, nr: 0 };
    room.set(
      f.to,
      fromLeft
        ? { ...r, left: Math.max(r.left, w), nl: r.nl + 1 }
        : { ...r, right: Math.max(r.right, w), nr: r.nr + 1 },
    );
  }
  for (const [id, r] of room) {
    const s = out.get(id);
    if (!s) continue;
    const [left, right] = [s.left + r.left, s.right + r.right];
    const h = Math.max(s.h, sidePinsHeight(Math.max(r.nl, r.nr)));
    out.set(id, { ...s, h, left, right, span: 2 * Math.max(left, right) });
  }
  return out;
}

/**
 * Reach per node for `laneColumns`. The question at a diamond stands on the right, unless an edge leaves to the
 * right and none to the left (`placeQuestions`); here the place of the neighbours in the lane predicts that.
 */
export function extents(g: Graph, ranks: ActivityRanks, sizes: ReadonlyMap<string, ActivitySize>): Extent {
  const lane = (id: string) => ranks.laneOf.get(id) ?? 0;
  const bar = (id: string) => ['fork', 'join'].includes(g.byId.get(id)?.kind ?? '');
  return (id, center) => {
    const s = sizes.get(id);
    if (!s) return undefined;
    const n = g.byId.get(id);
    if (n?.kind !== 'decision' || n.port || s.left === s.right) return s;
    const xs = ranks.flows
      .filter((f) => f.from === id && !f.back && !f.side)
      .map((f) => {
        const next = f.dummies[0] ?? f.to;
        if (lane(next) !== lane(id)) return lane(next) > lane(id) ? Infinity : -Infinity;
        return bar(next) ? 0 : (center.get(next) ?? 0) - (center.get(id) ?? 0);
      })
      .sort((a, b) => a - b);
    const edge = s.w / 2 + SIDEWAYS;
    const right = (xs.at(-1) ?? 0) > edge;
    const left = (xs[0] ?? 0) < -edge && (xs.length > 1 || !right);
    return right && !left ? { left: s.right, right: s.left } : s;
  };
}
