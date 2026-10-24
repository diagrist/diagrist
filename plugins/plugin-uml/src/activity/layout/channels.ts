import { ACT } from './metrics.js';
import type { ActivityRanks } from './rank.js';

/** Vertical channel of a back edge right of the nodes it runs around. */
export interface Channel {
  readonly x: number;
  readonly lane: number;
}

/**
 * Back edges (loops) run outside: right past all nodes of their lane between target and source. Inner loops get
 * the inner channel, overlapping ones move outwards. `outer` gives the right edge of a node with its side text.
 */
export function channels(ranks: ActivityRanks, outer: (id: string) => number | undefined): Map<number, Channel> {
  const layer = (id: string) => ranks.layerOf.get(id) ?? 0;
  const lane = (id: string) => ranks.laneOf.get(id) ?? 0;
  const back = ranks.flows
    .filter((f) => f.back)
    .map((f) => ({
      f,
      lo: Math.min(layer(f.from), layer(f.to)),
      hi: Math.max(layer(f.from), layer(f.to)),
      lane: Math.max(lane(f.from), lane(f.to)),
    }))
    .sort((a, b) => a.hi - a.lo - (b.hi - b.lo) || a.f.index - b.f.index);
  const out = new Map<number, Channel>();
  const placed: { lo: number; hi: number; lane: number; x: number }[] = [];
  for (const b of back) {
    const inside = ranks.ids.filter((id) => lane(id) === b.lane && layer(id) >= b.lo && layer(id) <= b.hi);
    const edge = Math.max(
      ...[...inside, b.f.from, b.f.to].map((id) => outer(id) ?? -Infinity),
      ...placed.filter((p) => p.lane === b.lane && p.lo <= b.hi && b.lo <= p.hi).map((p) => p.x),
    );
    const x = edge + ACT.loopGap;
    placed.push({ lo: b.lo, hi: b.hi, lane: b.lane, x });
    out.set(b.f.index, { x, lane: b.lane });
  }
  return out;
}
