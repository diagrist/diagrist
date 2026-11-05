import { cx, cy } from '../../geometry.js';
import { assignTracks, type TrackPiece } from '../../layered/channels.js';
import type { Box } from '../boxes.js';
import type { Plan } from '../grid.js';
import type { Port } from '../ports.js';
import type { Lane } from '../shape.js';

/** The middle piece of a Z in its gap, with the plan it belongs to; `via` for the second middle piece of a detour. */
interface ZPiece extends TrackPiece {
  readonly plan: Plan;
  readonly via: boolean;
}

/** Where a Z runs along its gap, and a detour along its second gap. */
export interface ZLane {
  readonly at: number;
  readonly via?: number;
}

/**
 * The lane of every Z, by plan: the middle pieces of one gap get tracks `gap` apart, centred on the middle of the
 * gap, in the order that loses the most crossings with the stubs coming in from either side (`assignTracks`), and
 * pieces that do not meet share a track. A detour (`Plan.via`) has a middle piece in each of its two gaps, each with
 * the stub of one end.
 */
export function zLanes(plans: readonly Plan[], ports: ReadonlyMap<Plan, Port>, gap: number): Map<Plan, ZLane> {
  const gutters = new Map<string, ZPiece[]>();
  const add = (lane: Lane, piece: ZPiece) => {
    const k = `${lane.axis}:${lane.at}`;
    gutters.set(k, [...(gutters.get(k) ?? []), piece]);
  };
  for (const p of plans) {
    const lane = p.lane;
    const port = ports.get(p);
    if (p.shape !== 'Z' || !lane || !port) continue;
    const before = (l: Lane, box: Box) => (l.axis === 'col' ? cx(box.rect) : cy(box.rect)) < l.at;
    const piece = (l: Lane, ends: readonly { at: number; first: boolean }[], span: readonly number[], via: boolean) =>
      add(l, {
        plan: p,
        via,
        tops: ends.filter((e) => e.first).map((e) => e.at),
        bottoms: ends.filter((e) => !e.first).map((e) => e.at),
        x1: Math.min(...span),
        x2: Math.max(...span),
        track: 0,
      });
    const from = { at: port.from, first: before(lane, p.a) };
    const via = p.via;
    if (!via) {
      piece(lane, [from, { at: port.to, first: before(lane, p.b) }], [port.from, port.to], false);
      continue;
    }
    piece(lane, [from], [port.from, via.at], false);
    piece(via, [{ at: port.to, first: before(via, p.b) }], [lane.at, port.to], true);
  }
  const out = new Map<Plan, ZLane>();
  for (const pieces of gutters.values()) {
    const count = assignTracks(pieces, gap);
    for (const p of pieces) {
      const base = (p.via ? p.plan.via?.at : p.plan.lane?.at) ?? 0;
      const at = base + (p.track - (count - 1) / 2) * gap;
      const was = out.get(p.plan) ?? { at: 0 };
      out.set(p.plan, p.via ? { ...was, via: at } : { ...was, at });
    }
  }
  return out;
}
