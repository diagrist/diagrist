import type { Point, Rect } from '@diagrist/core';
import type { LayerEdge } from '@diagrist/layout-grid';
import type { ActivityNode } from '../diagram.js';
import { expandBars } from './bars.js';
import { type Channel, channels } from './channels.js';
import { chainEdges, laneColumns } from './columns.js';
import { expansionArt } from './expansion.js';
import { extents, handlerSizes } from './extents.js';
import { type Graph, handlerOf } from './graph.js';
import { type LaneArt, laneArt, laneFrame, laneMinWidth } from './lanes.js';
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

const BARS = new Set(['fork', 'join']);

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

/**
 * Placement of an activity diagram: a layer is a row, a lane a column. Per lane the column solver orders the nodes;
 * lanes are as wide as their content, their name and the loops in them.
 */
export function placeActivity(g: Graph, pushed: readonly LayerEdge[] = []): ActivityPlacement {
  const ranks = rankActivity(g, pushed);
  const own = new Map(g.nodes.map((n) => [n.id, activitySize(n)]));
  const sizes = handlerSizes(g, own, ranks);
  const span = (id: string) => sizes.get(id)?.span ?? 0;
  const laneCount = Math.max(1, g.partitions.length);
  const order = laneOrder(ranks, chainEdges(ranks), handlerOf(g));
  const extent = extents(g, ranks, sizes);
  const cols = Array.from({ length: laneCount }, (_, i) => laneColumns(ranks, order, i, span, ACT.branchGap, extent));
  const colOf = (id: string) => cols[ranks.laneOf.get(id) ?? 0] ?? { center: new Map(), width: 0 };
  const reach = (id: string) => extent(id, colOf(id).center) ?? { left: span(id) / 2, right: span(id) / 2 };
  const frame = laneFrame(g);
  const pins = (id: string) => {
    const n = g.byId.get(id);
    return { input: n?.inputs.length ? ACT.pin : 0, output: n?.outputs.length ? ACT.pin : 0 };
  };
  const bands = regionBands(g, ranks.layerOf);
  const rows = rowsOf(
    ranks,
    (id) => sizes.get(id),
    pins,
    frame.firstRow,
    (l) => (bands.has(l) ? 2 * ACT.regionLabelH : 0),
  );
  const rowCenter = (id: string) => {
    const row = rows[ranks.layerOf.get(id) ?? 0] ?? { y: 0, h: 0 };
    return row.y + row.h / 2;
  };

  const build = (extra: readonly number[]) => {
    const base = cols.map((c, i) => laneMinWidth(g, i, c.width));
    const widths = base.map((w, i) => w + (extra[i] ?? 0));
    const xs = widths.map((_, i) => ACT.marginX + widths.slice(0, i).reduce((s, w) => s + w, 0));
    const centerX = (id: string) => {
      const lane = ranks.laneOf.get(id) ?? 0;
      const col = cols[lane] ?? { center: new Map(), width: 0 };
      return (xs[lane] ?? 0) + ((base[lane] ?? 0) - col.width) / 2 + (col.center.get(id) ?? 0);
    };
    const rects = new Map<string, Rect>();
    for (const [id, s] of sizes)
      rects.set(id, { x: centerX(id) - s.w / 2, y: rowCenter(id) - s.h / 2, w: s.w, h: s.h });
    const points = new Map([...ranks.dummy].map((id): [string, Point] => [id, [centerX(id), rowCenter(id)]]));
    const bars = g.nodes.filter((n) => BARS.has(n.kind)).map((n) => n.id);
    const pushes = expandBars(bars, rects, points, ranks);
    const outer = (id: string) => {
      const r = rects.get(id);
      if (!r) return points.get(id)?.[0];
      return r.x + r.w / 2 + Math.max(r.w / 2, reach(id).right);
    };
    return { widths, xs, rects, points, pushes, loops: channels(ranks, outer) };
  };

  const first = build(cols.map(() => 0));
  if (pushed.length === 0 && first.pushes.length > 0) return placeActivity(g, first.pushes);
  const extra = cols.map((_, i) => {
    const need = [...first.loops.values()].filter((c) => c.lane === i).map((c) => c.x + ACT.loopGap);
    const edge = (first.xs[i] ?? 0) + (first.widths[i] ?? 0);
    return Math.max(0, Math.ceil((Math.max(edge, ...need) - edge) / 8) * 8);
  });
  const final = extra.some((e) => e > 0) ? build(extra) : first;

  const placed = new Map<string, PlacedNode>();
  for (const n of g.nodes) {
    const rect = final.rects.get(n.id);
    if (rect) placed.set(n.id, { id: n.id, node: n, rect, art: activityArt(n, rect) });
  }
  const last = rows.at(-1);
  const contentBottom = last ? last.y + last.h : frame.firstRow;
  const bodyBottom = contentBottom + (frame.visible ? ACT.lanePadY : 0);
  const right = Math.max(
    ...final.widths.map((w, i) => (final.xs[i] ?? 0) + w),
    ...[...final.rects.values()].map((r) => r.x + r.w),
    ...[...final.loops.values()].map((c) => c.x),
  );
  const gutters = rows.slice(1).map((r, i) => {
    const above = rows[i] ?? r;
    return (above.y + above.h + r.y) / 2;
  });
  const placement: Placement = { nodes: placed, rows, gutters, bodyBottom, width: right + ACT.marginX };
  const lanes = laneArt(g, final.xs, final.widths, frame, bodyBottom);
  const regions = [...regionArt(g, final.rects, reach), ...expansionArt(g, final.rects, reach)];
  return { placement, ranks, points: final.points, lanes, channels: final.loops, regions };
}
