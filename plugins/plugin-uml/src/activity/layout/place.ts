import type { Point, Rect } from '@diagrist/core';
import type { LayerEdge } from '@diagrist/layout-grid';
import type { ActivityNode } from '../diagram.js';
import type { Channel } from './channels.js';
import { chainEdges, laneColumns } from './columns.js';
import { expansionArt } from './expansion.js';
import { extents, handlerSizes } from './extents.js';
import { type Graph, handlerOf } from './graph.js';
import { type LaneFit, type LaneGrid, laneFit, loopRoom } from './lane-fit.js';
import { type LaneArt, type LaneFrame, laneArt, laneFrame } from './lanes.js';
import { ACT } from './metrics.js';
import { laneOrder } from './order.js';
import { type ActivityRanks, rankActivity } from './rank.js';
import { type RegionArt, regionArt, regionBands } from './regions.js';
import { type ActivityArt, type ActivitySize, activityArt, activitySize } from './size.js';

/** A node with its place and drawing. */
export interface PlacedNode {
  readonly id: string;
  readonly node: ActivityNode;
  readonly rect: Rect;
  readonly art: ActivityArt;
}

/** A layer of the picture: top and height. */
export interface Row {
  readonly y: number;
  readonly h: number;
}

/** Where nodes, layers and lanes stand. */
export interface Placement {
  readonly nodes: ReadonlyMap<string, PlacedNode>;
  readonly rows: readonly Row[];
  /** Middle of the gap above every layer but the first. */
  readonly gutters: readonly number[];
  readonly bodyBottom: number;
  readonly width: number;
}

/** Placement with what routing needs: ranks, waypoints of long edges, lanes, loop channels, regions. */
export interface ActivityPlacement {
  readonly placement: Placement;
  readonly ranks: ActivityRanks;
  readonly points: ReadonlyMap<string, Point>;
  readonly lanes: readonly LaneArt[];
  readonly channels: ReadonlyMap<number, Channel>;
  readonly regions: readonly RegionArt[];
}

/**
 * Rows per layer: as tall as the tallest node, with a fixed gap between. Pins reach into the gap; it grows by their
 * size so the edge still has room to turn before the pin. Above a layer in which a named region starts, `band` adds
 * room for its name.
 */
function rowsOf(
  ranks: ActivityRanks,
  size: (id: string) => ActivitySize | undefined,
  pins: (id: string) => { readonly input: number; readonly output: number },
  top: number,
  band: (layer: number) => number,
): Row[] {
  const rows: Row[] = [];
  let y = top;
  for (let l = 0; l < ranks.layers; l++) {
    const ids = ranks.ids.filter((id) => ranks.layerOf.get(id) === l);
    const h = Math.max(0, ...ids.map((id) => size(id)?.h ?? 0));
    y += Math.max(0, ...ids.map((id) => pins(id).input)) + band(l);
    rows.push({ y, h });
    y += h + ACT.layerGap + Math.max(0, ...ids.map((id) => pins(id).output));
  }
  return rows;
}

/** One layering of the graph with its rows and lanes, and the lanes fitted at their least widths. */
interface Arrangement {
  readonly grid: LaneGrid;
  readonly rows: readonly Row[];
  readonly frame: LaneFrame;
  readonly fit: LaneFit;
}

/**
 * Placement of an activity diagram: a layer is a row, a lane a column. Per lane the column solver orders the nodes;
 * lanes are as wide as their content, their name and the loops in them. It takes at most two layerings: when a node
 * blocks the way of a fork or join bar in the first, the second moves it one layer down and is kept as it comes.
 * Then lanes whose loop channels do not fit grow and are fitted once more.
 */
export function placeActivity(g: Graph): ActivityPlacement {
  const first = arrange(g, []);
  const settled = first.fit.pushes.length > 0 ? arrange(g, first.fit.pushes) : first;
  const extra = loopRoom(settled.fit);
  const fit = extra.some((e) => e > 0) ? laneFit(settled.grid, extra) : settled.fit;
  return placed(settled, fit);
}

/** Ranks, sizes, columns and rows of one layering, `pushed` adding edges that move nodes down. */
function arrange(g: Graph, pushed: readonly LayerEdge[]): Arrangement {
  const ranks = rankActivity(g, pushed);
  const own = new Map(g.nodes.map((n) => [n.id, activitySize(n)]));
  const sizes = handlerSizes(g, own, ranks);
  const span = (id: string) => sizes.get(id)?.span ?? 0;
  const laneCount = Math.max(1, g.partitions.length);
  const order = laneOrder(ranks, chainEdges(ranks), handlerOf(g));
  const extent = extents(g, ranks, sizes);
  const cols = Array.from({ length: laneCount }, (_, i) => laneColumns(ranks, order, i, span, ACT.branchGap, extent));
  const reach = (id: string) => {
    const col = cols[ranks.laneOf.get(id) ?? 0] ?? { center: new Map(), width: 0 };
    return extent(id, col.center) ?? { left: span(id) / 2, right: span(id) / 2 };
  };
  const frame = laneFrame(g);
  const bands = regionBands(g, ranks.layerOf);
  const band = (l: number) => (bands.has(l) ? 2 * ACT.regionLabelH : 0);
  const rows = rowsOf(
    ranks,
    (id) => sizes.get(id),
    (id) => pinRoom(g, id),
    frame.firstRow,
    band,
  );
  const rowCenter = (id: string) => {
    const row = rows[ranks.layerOf.get(id) ?? 0] ?? { y: 0, h: 0 };
    return row.y + row.h / 2;
  };
  const grid: LaneGrid = { g, ranks, cols, sizes, rowCenter, reach };
  return {
    grid,
    rows,
    frame,
    fit: laneFit(
      grid,
      cols.map(() => 0),
    ),
  };
}

/** Room a node's pins take in the gaps above and below its row. */
function pinRoom(g: Graph, id: string): { readonly input: number; readonly output: number } {
  const n = g.byId.get(id);
  return { input: n?.inputs.length ? ACT.pin : 0, output: n?.outputs.length ? ACT.pin : 0 };
}

/** The placement of the fitted lanes: placed nodes, the bottom and width of the body, lanes and regions drawn. */
function placed({ grid, rows, frame }: Arrangement, fit: LaneFit): ActivityPlacement {
  const { g, ranks, reach } = grid;
  const nodes = new Map<string, PlacedNode>();
  for (const n of g.nodes) {
    const rect = fit.rects.get(n.id);
    if (rect) nodes.set(n.id, { id: n.id, node: n, rect, art: activityArt(n, rect) });
  }
  const last = rows.at(-1);
  const contentBottom = last ? last.y + last.h : frame.firstRow;
  const bodyBottom = contentBottom + (frame.visible ? ACT.lanePadY : 0);
  const right = Math.max(
    ...fit.widths.map((w, i) => (fit.xs[i] ?? 0) + w),
    ...[...fit.rects.values()].map((r) => r.x + r.w),
    ...[...fit.loops.values()].map((c) => c.x),
  );
  const gutters = rows.slice(1).map((r, i) => {
    const above = rows[i] ?? r;
    return (above.y + above.h + r.y) / 2;
  });
  const placement: Placement = { nodes, rows, gutters, bodyBottom, width: right + ACT.marginX };
  const lanes = laneArt(g, fit.xs, fit.widths, frame, bodyBottom);
  const regions = [...regionArt(g, fit.rects, reach), ...expansionArt(g, fit.rects, reach)];
  return { placement, ranks, points: fit.points, lanes, channels: fit.loops, regions };
}
