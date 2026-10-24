import type { Point, Rect } from '@diagrist/core';
import type { LayerEdge } from '@diagrist/layout-grid';
import { expandBars } from './bars.js';
import { type Channel, channels } from './channels.js';
import type { LaneColumns } from './columns.js';
import type { Graph } from './graph.js';
import { laneMinWidth } from './lanes.js';
import { ACT } from './metrics.js';
import type { ActivityRanks } from './rank.js';
import type { ActivitySize } from './size.js';

/** What the lanes are fitted from: the ranked graph, the column of each lane, the sizes and the rows. */
export interface LaneGrid {
  readonly g: Graph;
  readonly ranks: ActivityRanks;
  readonly cols: readonly LaneColumns[];
  readonly sizes: ReadonlyMap<string, ActivitySize>;
  /** Vertical middle of the row a node or waypoint stands in. */
  readonly rowCenter: (id: string) => number;
  /** How far a node, with the pins and texts beside it, reaches left and right of its centre. */
  readonly reach: (id: string) => { readonly left: number; readonly right: number };
}

/** Lanes side by side and what stands in them, for one set of extra widths. */
export interface LaneFit {
  readonly widths: readonly number[];
  /** Left edge of each lane. */
  readonly xs: readonly number[];
  readonly rects: ReadonlyMap<string, Rect>;
  /** Waypoints of long edges. */
  readonly points: ReadonlyMap<string, Point>;
  /** Edges that move a node blocking the way of a bar one layer down; empty when every bar found its branches. */
  readonly pushes: readonly LayerEdge[];
  /** Loop channels by the index of their flow. */
  readonly loops: ReadonlyMap<number, Channel>;
}

const BARS = new Set(['fork', 'join']);

const NO_COLUMN: LaneColumns = { center: new Map(), width: 0 };

/**
 * Places the lanes at their least widths plus `extra` each, the nodes and waypoints in them, widens the bars of fork
 * and join over their branches, and lays the loop channels beside the outermost node they pass.
 */
export function laneFit(grid: LaneGrid, extra: readonly number[]): LaneFit {
  const { g, ranks, cols, sizes, rowCenter } = grid;
  const base = cols.map((c, i) => laneMinWidth(g, i, c.width));
  const widths = base.map((w, i) => w + (extra[i] ?? 0));
  const xs = widths.map((_, i) => ACT.marginX + widths.slice(0, i).reduce((s, w) => s + w, 0));
  const centerX = (id: string) => centerIn(id, grid, xs, base);
  const rects = new Map<string, Rect>();
  for (const [id, s] of sizes) rects.set(id, { x: centerX(id) - s.w / 2, y: rowCenter(id) - s.h / 2, w: s.w, h: s.h });
  const points = new Map([...ranks.dummy].map((id): [string, Point] => [id, [centerX(id), rowCenter(id)]]));
  const bars = g.nodes.filter((n) => BARS.has(n.kind)).map((n) => n.id);
  const pushes = expandBars(bars, rects, points, ranks);
  const loops = channels(ranks, (id) => outerRight(id, rects, points, grid.reach));
  return { widths, xs, rects, points, pushes, loops };
}

/**
 * Room each lane grows by so that the loop channels in it, with their gap, stay inside, in whole lane steps; zero for
 * a lane whose loops fit.
 */
export function loopRoom(fit: LaneFit): number[] {
  return fit.widths.map((width, i) => {
    const need = [...fit.loops.values()].filter((c) => c.lane === i).map((c) => c.x + ACT.loopGap);
    const edge = (fit.xs[i] ?? 0) + width;
    return Math.max(0, Math.ceil((Math.max(edge, ...need) - edge) / ACT.laneStep) * ACT.laneStep);
  });
}

/** Horizontal centre of a node or waypoint: its lane's left edge, the column centred in the least width, its place. */
function centerIn(id: string, grid: LaneGrid, xs: readonly number[], base: readonly number[]): number {
  const lane = grid.ranks.laneOf.get(id) ?? 0;
  const col = grid.cols[lane] ?? NO_COLUMN;
  return (xs[lane] ?? 0) + ((base[lane] ?? 0) - col.width) / 2 + (col.center.get(id) ?? 0);
}

/** Right end of a node with what reaches out of it, or the place of a waypoint; a loop channel passes beyond it. */
function outerRight(
  id: string,
  rects: ReadonlyMap<string, Rect>,
  points: ReadonlyMap<string, Point>,
  reach: LaneGrid['reach'],
): number | undefined {
  const r = rects.get(id);
  if (!r) return points.get(id)?.[0];
  return r.x + r.w / 2 + Math.max(r.w / 2, reach(id).right);
}
