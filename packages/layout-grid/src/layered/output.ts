import type { LineInput, Placed, Point, Rect } from '@diagrist/core';
import type { EdgeLabel } from '../label/types.js';
import type { PlacedGroup, PlacedNode, Route } from '../layout.js';
import { linesOfLaid } from '../score.js';
import { cornerSeat } from './docks.js';
import { type CoreFrame, frameOf } from './frame.js';
import { outsideFrames } from './frame-ends.js';
import { middleSeat, type Seat, seatAt } from './labels.js';
import type { Group, Link } from './links.js';
import type { Ports } from './ports.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';
import { spotLabels } from './spots.js';
import { hungLines, tetherRoutes } from './tethers.js';
import { textBlocks } from './text-blocks.js';

/** The weight of a soft line in the measure: its bends count half, and it does not count for centring. */
const SOFT = 0.5;

/** A laid out layered picture: boxes, one route per edge, labels, the trunk each edge shares, size and checks. */
export interface LayeredLayout {
  readonly nodes: readonly PlacedNode[];
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  /** The edges that share a trunk, by edge: a key of the trunk per fan or join. */
  readonly trunks: ReadonlyMap<string, string>;
  readonly width: number;
  readonly bottom: number;
  readonly placed: readonly Placed[];
  /** The frame around the core of a hub picture, with its head. */
  readonly frame?: CoreFrame;
  /** The frames of `LayeredSpec.frames` that hold boxes, parents first. */
  readonly frames?: readonly PlacedGroup[];
  /** The columns of `LayeredSpec.lanes`, left to right, from the top of the picture to its bottom. */
  readonly lanes?: readonly PlacedGroup[];
}

/** What is placed and routed, before the labels are seated and the picture is measured. */
export interface Laid {
  readonly ranked: Ranked;
  readonly layers: readonly (readonly string[])[];
  readonly rects: ReadonlyMap<string, Rect>;
  readonly routes: readonly Route[];
  readonly seats: readonly Seat[];
  readonly ports: Ports;
  readonly groups: readonly Group[];
  readonly core: ReadonlySet<string>;
  readonly frames?: readonly PlacedGroup[];
  /** Texts the pipeline set without a seat, such as those of loops. */
  readonly loose?: readonly EdgeLabel[];
}

/** A laid out picture and the edges whose texts found no clear spot. */
export type Assembled = LayeredLayout & { readonly crowded: readonly string[] };

/**
 * The labels of `laid` at their seats, before the spot search keeps or moves them (`spotLabels`): at the corner a line
 * leaves from, at the middle of a straight single line, else beside its port (`seatAt`).
 */
function seated(spec: LayeredSpec, laid: Pick<Laid, 'rects' | 'routes' | 'seats' | 'ports' | 'frames'>): EdgeLabel[] {
  const { rects, routes, ports } = laid;
  const gap = spec.metrics.labelGap;
  const index = new Map(routes.map((r, i) => [r.edge, i]));
  return laid.seats.flatMap((seat) => {
    const route = index.get(seat.edge.id) ?? 0;
    const corner = cornerSeat(seat, ports, rects, route, gap);
    if (corner) return corner;
    const line = routes[route];
    const shown = line && seat.group.kind === 'single' && outsideFrames(line, seat.edge, laid.frames ?? []);
    const middle = shown && middleSeat(seat, shown.points, route, gap);
    if (middle) return middle;
    const l = seat.group.links[0] as Link;
    const port: Point =
      seat.at === 'top'
        ? [ports.bottom.get(l) ?? 0, (rects.get(l.upper)?.y ?? 0) + (rects.get(l.upper)?.h ?? 0)]
        : [ports.top.get(l) ?? 0, rects.get(l.lower)?.y ?? 0];
    return seatAt(seat, port, route, gap);
  });
}

/** The labels of `laid` at their seats (`seated`), kept there or moved clear by the spot search (`spotLabels`). */
export function spot(
  spec: LayeredSpec,
  laid: Pick<Laid, 'ranked' | 'rects' | 'routes' | 'seats' | 'ports' | 'groups' | 'frames' | 'loose'>,
): { labels: EdgeLabel[]; crowded: number[] } {
  const real = new Map([...laid.rects].filter(([n]) => !laid.ranked.dummies.has(n)));
  const chained = new Set(laid.groups.flatMap((g) => g.links.map((l) => l.edge)));
  const drawn = {
    routes: laid.routes,
    rects: real,
    frames: laid.frames ?? [],
    width: Number.MAX_SAFE_INTEGER,
    bottom: 0,
  };
  return spotLabels(spec, drawn, [...seated(spec, laid), ...(laid.loose ?? [])], chained);
}

/**
 * Draws the lines of boxes hanging from lines (`tetherRoutes`), seats the labels and lets the spot search keep them
 * there or move them clear (`spotLabels`), then gathers boxes, labels, the frame of a hub and the frames, and measures
 * the picture.
 */
export function assemble(spec: LayeredSpec, unhung: Laid): Assembled {
  const m = spec.metrics;
  const { ranked, layers, rects, groups, core } = unhung;
  const real = new Map([...rects].filter(([n]) => !ranked.dummies.has(n)));
  const laid = { ...unhung, routes: [...unhung.routes, ...tetherRoutes(spec, real, unhung.routes)] };
  const routes = laid.routes;
  const size = new Map(spec.nodes.map((n) => [n.id, n]));
  const trunks = new Map(
    groups.flatMap((g, i) => (g.kind === 'single' ? [] : g.links.map((l) => [l.edge, `${g.kind}-${i}`] as const))),
  );
  const spotted = spot(spec, laid);
  const labels = spotted.labels;
  const nodes = spec.nodes.flatMap((n): PlacedNode[] => {
    const r = rects.get(n.id);
    const row = ranked.layerOf.get(n.id) ?? 0;
    return r ? [{ id: n.id, rect: r, col: layers[row]?.indexOf(n.id) ?? 0, row }] : [];
  });
  const frames = laid.frames ?? [];
  const xs = [
    ...nodes.map((n) => n.rect.x + n.rect.w),
    ...labels.map((l) => l.box.x + l.box.w),
    ...routes.flatMap((r) => r.points.map((p) => p[0])),
    ...frames.map((f) => f.rect.x + f.rect.w),
  ];
  const ys = [
    ...nodes.map((n) => n.rect.y + n.rect.h),
    ...labels.map((l) => l.box.y + l.box.h),
    ...routes.flatMap((r) => r.points.map((p) => p[1])),
    ...frames.map((f) => f.rect.y + f.rect.h),
  ];
  const placed: Placed[] = [
    ...nodes.map((n): Placed => {
      const s = size.get(n.id);
      return {
        key: n.id,
        kind: 'box',
        rect: n.rect,
        ...(s?.shape === 'ellipse' ? { outline: 'ellipse' as const } : {}),
        ...(s?.source ? { span: s.source } : {}),
      };
    }),
    ...labels.map((l, i): Placed => {
      const e = spec.edges.find((k) => k.id === routes[l.route]?.edge);
      const n = labels.slice(0, i).filter((k) => k.route === l.route).length + 1;
      return { key: `${e?.id ?? ''}.label.${n}`, kind: 'text', rect: l.box, ...(e?.source ? { span: e.source } : {}) };
    }),
  ];
  const fence =
    spec.hub &&
    frameOf(
      spec.hub,
      [...core].flatMap((n) => rects.get(n) ?? []),
      m.labelGap,
      routes.map((r) => r.points),
    );
  if (fence) placed.push({ key: 'hub.head', kind: 'text', rect: fence.head.box });
  const right = Math.max(0, ...xs, fence ? fence.rect.x + fence.rect.w : 0);
  const bottom = Math.max(m.top, ...ys, fence ? fence.rect.y + fence.rect.h : 0);
  return {
    nodes,
    routes,
    labels,
    trunks,
    width: right,
    bottom,
    placed,
    ...(fence ? { frame: fence } : {}),
    ...(laid.frames ? { frames: laid.frames } : {}),
    crowded: spotted.crowded.map((i) => routes[i]?.edge ?? ''),
  };
}

/**
 * The lines of a laid out picture as the line check reads them, with the frames and the head of its core, each
 * weighted as the measure weighs it: a main path more, a soft line less, and every text as one block (`textBlocks`);
 * a line hanging from a line reads as `hungLines` says.
 */
export function layeredLines(spec: LayeredSpec, layout: LayeredLayout): LineInput {
  const ends = new Map(spec.edges.map((e) => [e.id, [e.from, e.to] as const]));
  const weight = new Map(spec.edges.map((e) => [e.id, e.strength === 'soft' ? SOFT : Math.max(1, e.weight ?? 1)]));
  const core = layout.frame === undefined ? [] : [{ id: 'core', rect: layout.frame.rect, head: layout.frame.head.box }];
  return hungLines(
    spec,
    SOFT,
    linesOfLaid({
      nodes: layout.nodes,
      routes: layout.routes,
      ends: layout.routes.map((r) => ends.get(r.edge) ?? ['', '']),
      weights: layout.routes.map((r) => weight.get(r.edge) ?? 1),
      labels: textBlocks(layout.labels),
      frames: [...core, ...(layout.frames ?? [])],
      width: layout.width,
      height: layout.bottom,
    }),
  );
}
