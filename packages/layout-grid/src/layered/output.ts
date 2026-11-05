import { DEFAULT_THRESHOLDS, type Placed, type Point, type Rect } from '@diagrist/core';
import type { EdgeLabel } from '../label/types.js';
import type { PlacedGroup, PlacedNode, Route } from '../layout.js';
import { type CoreFrame, frameOf } from './frame.js';
import { type Seat, seatLabel } from './labels.js';
import type { Group, Link } from './links.js';
import type { Ports } from './ports.js';
import type { Ranked } from './rank.js';
import type { LayeredSpec } from './spec.js';

/** Room a label keeps from foreign lines, one more than the line check's least distance (G418). */
const LABEL_CLEAR = DEFAULT_THRESHOLDS.labelClear + 1;

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
}

/** Seats the labels, then gathers boxes, labels, the frame of a hub and the frames, and measures the picture. */
export function assemble(spec: LayeredSpec, laid: Laid): LayeredLayout {
  const m = spec.metrics;
  const { ranked, layers, rects, routes, ports, groups, core } = laid;
  const size = new Map(spec.nodes.map((n) => [n.id, n]));
  const index = new Map(routes.map((r, i) => [r.edge, i]));
  const trunks = new Map(
    groups.flatMap((g, i) => (g.kind === 'single' ? [] : g.links.map((l) => [l.edge, `${g.kind}-${i}`] as const))),
  );
  const boxes = spec.nodes.flatMap((n) => {
    const r = rects.get(n.id);
    return r ? [r] : [];
  });
  const labels: EdgeLabel[] = [];
  for (const seat of laid.seats) {
    const l = seat.group.links[0] as Link;
    const port: Point =
      seat.at === 'top'
        ? [ports.bottom.get(l) ?? 0, (rects.get(l.upper)?.y ?? 0) + (rects.get(l.upper)?.h ?? 0)]
        : [ports.top.get(l) ?? 0, rects.get(l.lower)?.y ?? 0];
    const own = new Set(seat.group.links.map((k) => k.edge));
    const clear = { lines: routes, boxes: [...boxes, ...labels.map((x) => x.box)], margin: LABEL_CLEAR };
    labels.push(seatLabel(seat, port, index.get(seat.edge.id) ?? 0, m.labelGap, clear, own));
  }
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
    ...labels.map((l): Placed => {
      const e = spec.edges.find((k) => k.id === routes[l.route]?.edge);
      return { key: `${e?.id ?? ''}.label.1`, kind: 'text', rect: l.box, ...(e?.source ? { span: e.source } : {}) };
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
  };
}
