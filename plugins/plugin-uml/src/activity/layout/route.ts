import type { Side } from '@diagrist/layout-grid';
import type { Graph, GraphFlow } from './graph.js';
import type { XY } from './metrics.js';
import type { ActivityPlacement } from './place.js';
import { type Port, ports } from './ports.js';
import type { RankedFlow } from './rank.js';
import { separateJogs } from './tracks.js';

/** An edge with its route and the sides it leaves and enters by. */
export interface Routed {
  readonly flow: GraphFlow;
  readonly points: readonly XY[];
  readonly fromSide: Side;
  readonly toSide: Side;
}

/** The gap above layer `layer`, midway between the rows. */
const gutterAbove = (ap: ActivityPlacement, layer: number) => ap.placement.gutters[layer - 1] ?? 0;

/**
 * A forward edge: out of a diamond at the side, else straight down; horizontal pieces only in the gaps between
 * layers, over the waypoints of long edges; into a diamond at the side, else from the top.
 */
function forward(ap: ActivityPlacement, f: RankedFlow, from: Port, to: Port): XY[] {
  const pts: XY[] = [from.at];
  let x = from.at[0];
  const waypoints = f.dummies.map((id) => ({
    x: ap.points.get(id)?.[0] ?? 0,
    layer: ap.ranks.layerOf.get(id) ?? 0,
  }));
  const layerTo = ap.ranks.layerOf.get(f.to) ?? 0;
  const sideIn = to.side === 'left' || to.side === 'right';
  const outside = to.side === 'left' ? Math.min(x, to.at[0]) - 16 : Math.max(x, to.at[0]) + 16;
  const sideOut = from.side === 'left' || from.side === 'right';
  const lastX = sideIn ? (waypoints.at(-1)?.x ?? (sideOut ? outside : x)) : to.at[0];
  if (sideOut) {
    x = waypoints[0]?.x ?? lastX;
    pts.push([x, from.at[1]]);
  }
  const jog = (nx: number, layer: number) => {
    if (Math.abs(nx - x) < 0.5) return;
    const y = gutterAbove(ap, layer);
    pts.push([x, y], [nx, y]);
    x = nx;
  };
  for (const w of waypoints) jog(w.x, w.layer);
  if (sideIn) {
    jog(lastX, layerTo);
    pts.push([x, to.at[1]], to.at);
  } else {
    jog(to.at[0], layerTo);
    pts.push(to.at);
  }
  return dedupe(pts);
}

/** A back edge or self loop: out on the right, up in its channel, in from the right. */
function backward(ap: ActivityPlacement, f: RankedFlow, from: Port, to: Port): XY[] {
  const channel = ap.channels.get(f.index)?.x ?? from.at[0];
  if (f.from === f.to) {
    const [rx, y] = from.at;
    return [
      [rx, y - 10],
      [channel, y - 10],
      [channel, y + 10],
      [rx, y + 10],
    ];
  }
  const layer = (id: string) => ap.ranks.layerOf.get(id) ?? 0;
  const lastRow = ap.placement.rows.at(-1)?.h ?? 0;
  const below = gutterAbove(ap, layer(f.from) + 1) || from.at[1] + lastRow / 2 + 24;
  const above = gutterAbove(ap, layer(f.to)) || to.at[1] - 24;
  const start: XY[] = from.side === 'right' ? [from.at] : [from.at, [from.at[0], below]];
  const end: XY[] = to.side === 'right' ? [to.at] : [[to.at[0], above], to.at];
  const out = start.at(-1) ?? from.at;
  const into = end[0] ?? to.at;
  return dedupe([...start, [channel, out[1]], [channel, into[1]], ...end]);
}

/** Drops repeated points and middle points on a straight line. */
export function dedupe(points: readonly XY[]): XY[] {
  const out: XY[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last && last[0] === p[0] && last[1] === p[1]) continue;
    const prev = out.at(-2);
    if (prev && last && ((prev[0] === last[0] && last[0] === p[0]) || (prev[1] === last[1] && last[1] === p[1])))
      out.pop();
    out.push(p);
  }
  return out;
}

/** All edges in source order, handler bolts after them. */
export function routeActivity(g: Graph, ap: ActivityPlacement): Routed[] {
  const portMap = ports(ap);
  const routes = ap.ranks.flows.flatMap((f): Routed[] => {
    const p = portMap.get(f.index);
    const flow = g.flows[f.index];
    if (!p || !flow) return [];
    const points = f.side
      ? [p.from.at, p.to.at]
      : f.back
        ? backward(ap, f, p.from, p.to)
        : forward(ap, f, p.from, p.to);
    return [{ flow, points, fromSide: p.from.side, toSide: p.to.side }];
  });
  return separateJogs(routes);
}
