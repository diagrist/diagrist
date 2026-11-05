import { cx, cy } from '../../geometry.js';
import { assignTracks, type TrackPiece } from '../../layered/channels.js';
import type { Plan } from '../grid.js';
import type { Port } from '../ports.js';

/** The middle piece of a Z in its gap, with the plan it belongs to. */
interface ZPiece extends TrackPiece {
  readonly plan: Plan;
}

/**
 * The lane of every Z, by plan: the middle pieces of one gap get tracks `gap` apart, centred on the middle of the
 * gap, in the order that loses the most crossings with the stubs coming in from either side (`assignTracks`), and
 * pieces that do not meet share a track.
 */
export function zLanes(plans: readonly Plan[], ports: ReadonlyMap<Plan, Port>, gap: number): Map<Plan, number> {
  const gutters = new Map<string, ZPiece[]>();
  for (const p of plans) {
    const lane = p.lane;
    const port = ports.get(p);
    if (p.shape !== 'Z' || !lane || !port) continue;
    const before = (centre: number) => centre < lane.at;
    const ends = [
      { at: port.from, first: before(lane.axis === 'col' ? cx(p.a.rect) : cy(p.a.rect)) },
      { at: port.to, first: before(lane.axis === 'col' ? cx(p.b.rect) : cy(p.b.rect)) },
    ];
    const piece: ZPiece = {
      plan: p,
      tops: ends.filter((e) => e.first).map((e) => e.at),
      bottoms: ends.filter((e) => !e.first).map((e) => e.at),
      x1: Math.min(port.from, port.to),
      x2: Math.max(port.from, port.to),
      track: 0,
    };
    const k = `${lane.axis}:${lane.at}`;
    gutters.set(k, [...(gutters.get(k) ?? []), piece]);
  }
  const out = new Map<Plan, number>();
  for (const pieces of gutters.values()) {
    const count = assignTracks(pieces, gap);
    for (const p of pieces) out.set(p.plan, (p.plan.lane?.at ?? 0) + (p.track - (count - 1) / 2) * gap);
  }
  return out;
}
