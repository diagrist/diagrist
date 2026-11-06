import type { Rect } from '@diagrist/core';
import { layoutGraph } from '@diagrist/layout-grid';
import { activityGraph, flowId } from './engine.js';
import { expansionArt } from './expansion.js';
import type { Graph } from './graph.js';
import type { GuardText } from './guards.js';
import { type LaneArt, laneArt } from './lanes.js';
import type { PlacedNode, Routed } from './placement.js';
import { type RegionArt, regionArt } from './regions.js';
import { sideBolts } from './side-bolts.js';
import { activityArt, activitySize } from './size.js';

/** An activity diagram as the layout engine laid it out, in the terms the rest of the kind reads. */
export interface Laid {
  readonly nodes: ReadonlyMap<string, PlacedNode>;
  /** Routes of the flows in their order, handler bolts after them. */
  readonly routes: readonly Routed[];
  readonly lanes: readonly LaneArt[];
  readonly regions: readonly RegionArt[];
  readonly guards: readonly GuardText[];
  /** Right edge and bottom of the body, lanes included. */
  readonly right: number;
  readonly bottom: number;
}

/**
 * Lays an activity diagram out by `layoutGraph` (ADR 0039): nodes with their drawing, routes, lanes, the frames of
 * its regions, and the guards where the engine's spot search set them.
 */
export function laidActivity(g: Graph): Laid {
  return sideBolts(g, laidBy) ?? laidBy(g);
}

/** An activity diagram as the layout engine lays out its graph. */
function laidBy(g: Graph): Laid {
  const layout = layoutGraph(activityGraph(g));
  const rects = new Map(layout.nodes.map((n) => [n.id, n.rect]));
  const nodes = new Map(
    g.nodes.flatMap((n): [string, PlacedNode][] => {
      const rect = rects.get(n.id);
      return rect ? [[n.id, { id: n.id, node: n, rect, art: activityArt(n, rect) }]] : [];
    }),
  );
  const byEdge = new Map(layout.routes.map((r) => [r.edge, r]));
  const routes = g.flows.flatMap((flow): Routed[] => {
    const r = byEdge.get(flowId(flow.index));
    return r ? [{ flow, points: r.points, fromSide: r.fromSide, toSide: r.toSide }] : [];
  });
  const at = new Map(routes.map((r, k) => [flowId(r.flow.index), k]));
  const guards = layout.labels.flatMap((l): GuardText[] => {
    const k = at.get(layout.routes[l.route]?.edge ?? '');
    return k === undefined ? [] : [{ text: l.text, x: l.x, y: l.y, anchor: l.anchor, route: k }];
  });
  const frames = new Map<string, Rect>((layout.frames ?? []).map((f) => [f.id, f.rect]));
  const extent = (id: string) => {
    const n = g.byId.get(id);
    const s = n ? activitySize(n) : undefined;
    return { left: s?.left ?? 0, right: s?.right ?? 0 };
  };
  return {
    nodes,
    routes,
    lanes: laneArt(g, new Map((layout.lanes ?? []).map((l) => [l.id, l.rect]))),
    regions: [...regionArt(g, frames), ...expansionArt(g, rects, extent, frames)],
    guards,
    right: layout.width,
    bottom: layout.bottom,
  };
}
