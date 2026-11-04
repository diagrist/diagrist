import { type AreaMark, areaMark, domId } from '@diagrist/core';
import type { ActivityAreas } from '../areas.js';
import type { ActivityLayout } from '../layout/index.js';
import type { ActivityModel } from '../model/index.js';

/**
 * The area marks of an activity diagram by DOM id: nodes as bodies, lanes as frames, edges and their guards as lines,
 * `routes[k]` drawn as `edge-<k>` and its guard as `label-<k>`. Regions keep their ink: they belong to no area.
 */
export function activityAreaMarks(m: ActivityModel, l: ActivityLayout, of: ActivityAreas): Map<string, AreaMark> {
  const out = new Map<string, AreaMark>();
  const put = (id: string, area: string | undefined, as: AreaMark['as']) => {
    const mark = areaMark(m.diagram.areas, area, as);
    if (mark !== undefined) out.set(id, mark);
  };
  for (const p of l.nodes) put(domId.node(p.id), of.node(p.id), 'body');
  for (const lane of l.lanes)
    put(domId.group(lane.id), m.diagram.partitions.find((p) => p.id === lane.id)?.area, 'line');
  l.routes.forEach((r, k) => {
    put(domId.edge(k), of.flow(r.flow), 'line');
  });
  for (const g of l.guards) {
    const route = l.routes[g.route];
    if (route !== undefined) put(domId.label(g.route), of.flow(route.flow), 'line');
  }
  return out;
}

/** The areas the picture paints something in, for its legend. */
export const usedAreas = (m: ActivityModel, of: ActivityAreas): Set<string> =>
  new Set(
    [
      ...m.diagram.partitions.map((p) => p.area),
      ...m.nodes.map((n) => of.node(n.id)),
      ...m.flows.map((f) => of.flow(f)),
      ...m.handlers.map((h) => of.flow({ from: h.protected, to: h.handler })),
    ].filter((a): a is string => a !== undefined),
  );
