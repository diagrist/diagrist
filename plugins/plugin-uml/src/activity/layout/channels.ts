import { ACT } from './metrics.js';
import type { ActivityRanks } from './rank.js';

/** Vertical channel of a back edge right of the nodes it runs around. */
export interface Channel {
  readonly x: number;
  readonly lane: number;
}

/** Where a node or waypoint reaches from left to right, with what stands beside it. */
export type Reach = (id: string) => { readonly left: number; readonly right: number } | undefined;

/** Least clearance of a line from a node it does not join, as the line check asks (G411). */
const CLEAR = 6;

/**
 * Back edges (loops) run outside: right past all nodes of their lane between target and source. Inner loops get
 * the inner channel, overlapping ones move outwards. A channel that would run through a node of another lane in
 * its layers, such as a bar reaching over the next lanes or a node beside one, moves right past it, into that
 * node's lane, so a loop over several lanes cuts through nothing. `reach` gives the extent of a node with its side
 * text.
 */
export function channels(ranks: ActivityRanks, reach: Reach): Map<number, Channel> {
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
    const range = (l: number) => l >= b.lo && l <= b.hi;
    const inside = ranks.ids.filter((id) => lane(id) === b.lane && range(layer(id)));
    const crossed = placed.filter((p) => p.lo <= b.hi && b.lo <= p.hi);
    const edge = Math.max(
      ...[...inside, b.f.from, b.f.to].map((id) => reach(id)?.right ?? -Infinity),
      ...crossed.filter((p) => p.lane === b.lane).map((p) => p.x),
    );
    let x = edge + ACT.loopGap;
    let at = b.lane;
    const passed = ranks.ids.filter((id) => !ranks.dummy.has(id) && range(layer(id)));
    for (let moved = true; moved; ) {
      moved = false;
      const node = passed.find((id) => {
        const r = reach(id);
        return r !== undefined && r.left - CLEAR < x && x < r.right + CLEAR;
      });
      const channel = crossed.find((p) => Math.abs(p.x - x) < ACT.loopGap);
      if (node !== undefined) [x, at] = [(reach(node)?.right ?? x) + ACT.loopGap, Math.max(at, lane(node))];
      else if (channel !== undefined) [x, at] = [channel.x + ACT.loopGap, Math.max(at, channel.lane)];
      moved = node !== undefined || channel !== undefined;
    }
    placed.push({ lo: b.lo, hi: b.hi, lane: at, x });
    out.set(b.f.index, { x, lane: at });
  }
  return out;
}
