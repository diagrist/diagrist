import { lineArea } from '@diagrist/core';
import type { Flow } from './diagram.js';
import { layoutGraph } from './layout/graph.js';
import { nodeLanes } from './layout/rank.js';
import type { ActivityModel } from './model/index.js';

/** Where a node and an edge of an activity diagram belong (ADR 0033). */
export interface ActivityAreas {
  /** The area of a node: its own, else that of the lane it stands in. */
  readonly node: (id: string) => string | undefined;
  /** The area of an edge: its own, else the coloured one of its source, else of its target. */
  readonly flow: (f: Pick<Flow, 'from' | 'to' | 'area'>) => string | undefined;
}

/**
 * The areas of the nodes and edges of a model. A node without `in` stands in the lane the layout gives it, the lane
 * of a neighbour, so it takes the area of that lane: what the picture shows inside a coloured lane is coloured.
 */
export function activityAreas(m: ActivityModel): ActivityAreas {
  const areas = m.diagram.areas;
  const partitions = m.diagram.partitions;
  const lanes = partitions.some((p) => p.area !== undefined) ? nodeLanes(layoutGraph(m)) : new Map<string, number>();
  const node = (id: string): string | undefined => {
    const lane = lanes.get(id);
    return m.byId.get(id)?.area ?? (lane === undefined ? undefined : partitions[lane]?.area);
  };
  return { node, flow: (f) => lineArea(areas, f.area, node(f.from), node(f.to)) };
}
