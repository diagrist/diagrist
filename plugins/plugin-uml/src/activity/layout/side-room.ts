import type { ActivityNode } from '../diagram.js';
import { type Graph, isHandlerFlow } from './graph.js';
import { ACT, widthOf } from './metrics.js';
import { activitySize } from './size.js';

/**
 * How far the texts beside a node reach out of its symbol, which no other box may come nearer: the question of a
 * decision on either side, where `placeQuestions` may set it, the time of a time event and the name of an expansion
 * node on the right, the keyword of a region left of its first input, the name of a pin alone on the top or bottom on
 * the right of its square, wherever along the side the square stands (several share their side evenly), and the
 * type of an exception on the right of a handler, where the bolt of a second protected action comes in on a rail.
 */
export function sideReach(g: Graph, n: ActivityNode): { left: number; right: number } | undefined {
  const s = activitySize(n);
  const [left, right] = [s.left - s.w / 2, s.right - s.w / 2];
  const either = n.kind === 'decision' && !n.port ? Math.max(left, right) : 0;
  const alone = [n.inputs, n.outputs].flatMap((side) => (side.length === 1 ? side : []));
  const names = alone.map((p) => widthOf.label(p) + ACT.pin / 2 + ACT.pinGap);
  const pins = g.pinReach?.get(n.id) ?? Math.max(0, ...names.map((w) => w - Math.min(16, s.w / 4)));
  const bolts = g.flows.filter((f) => isHandlerFlow(f) && f.to === n.id && f.held !== true);
  const later = bolts.slice(1).flatMap((f) => (isHandlerFlow(f) ? [boltRoom(f.exception) - 4 * ACT.bolt] : []));
  const exception = Math.max(0, ...later);
  const out = { left: Math.max(left, either), right: Math.max(right, either, pins, exception) };
  return out.left > 0 || out.right > 0 ? out : undefined;
}

/** Room an exception pin with its type takes beside the bolt into a handler. */
export const boltRoom = (exception: string): number => widthOf.label(exception) + ACT.pin + ACT.pinGap + 4 * ACT.bolt;
