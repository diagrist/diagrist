import type { Placed, Point, Rect } from '@diagrist/core';
import type { EdgeLabel } from '../label/types.js';
import type { PlacedNode, Route } from '../layout.js';
import { besideRoutes, sideOf } from './beside.js';
import { assignTracks, gapHeight, type Piece, piecesOf } from './channels.js';
import { coords } from './coords.js';
import { type Frame, linkPoints, simplify } from './geometry.js';
import { labelRoom, seatLabel, seatsOf } from './labels.js';
import { type Group, groupsOf, type Link, linksOf } from './links.js';
import { neighboursOf, orderRanked } from './order.js';
import { portsOf } from './ports.js';
import { rank } from './rank.js';
import type { LayeredSpec } from './spec.js';

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
}

/**
 * Lays out a layered picture (plan L2–L3): layers with placeholders, an order that weighs crossings, positions with
 * real widths, fans and joins, ports, tracks per gap, routes and one label per line or trunk.
 */
export function layoutLayered(spec: LayeredSpec): LayeredLayout {
  const m = spec.metrics;
  const ranked = rank(spec);
  const neighbours = neighboursOf(spec, ranked);
  const layers = orderRanked(spec, ranked, neighbours);
  const size = new Map(spec.nodes.map((n) => [n.id, n]));
  const width = (id: string) => size.get(id)?.width ?? 0;
  const dummy = (id: string) => ranked.dummies.has(id);
  const gap = (a: string, b: string) =>
    dummy(a) && dummy(b) ? m.track : dummy(a) || dummy(b) ? m.colGap / 2 : m.colGap;
  const x = coords({ layers, width, gap, links: neighbours, ranked }, m.left);
  const flat = new Map([...x].map(([id, cx]) => [id, { x: cx - width(id) / 2, y: 0, w: width(id), h: 0 }]));
  const links = linksOf(spec, ranked);
  const groups = groupsOf(spec, ranked, layers, links);
  const ports = portsOf(groups, ranked, flat, x, m.portGap);
  const seats = seatsOf(spec.edges, groups, ranked);
  const pieceOf = new Map<Group, Piece>();
  const tracks = layers.map((_, l) => {
    const pieces = piecesOf(
      groups.filter((g) => g.links[0]?.gap === l),
      ports,
    );
    for (const p of pieces) pieceOf.set(p.group, p);
    return assignTracks(pieces);
  });
  const below = besideRoutes(ranked, layers);
  const first = layers.map((_, l) => Math.max(m.tail, labelRoom(seats, l, 'top', m.labelGap)));
  const last = layers.map((_, l) => Math.max(m.lead, labelRoom(seats, l, 'bottom', m.labelGap)));
  const rects = new Map<string, Rect>();
  const gapTop: number[] = [];
  let y = m.top;
  layers.forEach((layer, l) => {
    const band = Math.max(0, ...layer.map((n) => size.get(n)?.height ?? 0));
    for (const n of layer) {
      const h = size.get(n)?.height ?? band;
      rects.set(n, { x: (x.get(n) ?? 0) - width(n) / 2, y: y + (band - h) / 2, w: width(n), h });
    }
    gapTop.push(y + band);
    const extra = below.count(l);
    const needed = (tracks[l] ?? 0) + extra;
    const measure = { first: first[l] ?? m.tail, track: m.track, last: last[l] ?? m.lead, min: m.rowGapMin };
    y += band + (l === layers.length - 1 && extra === 0 ? 0 : gapHeight(needed, measure));
  });
  const frame: Frame = { rects, gapTop, first, track: m.track };
  const groupOf = new Map<Link, Group>(groups.flatMap((g) => g.links.map((l) => [l, g] as const)));
  const routes = spec.edges.flatMap((e): Route[] => {
    const chain = links.filter((l) => l.edge === e.id);
    if (chain.length === 0) {
      const beside = below.route(e, frame, tracks);
      return beside === undefined ? [] : [beside];
    }
    const points = simplify(
      chain.flatMap((l) => {
        const g = groupOf.get(l) as Group;
        return linkPoints(l, g, pieceOf.get(g), ports, frame);
      }),
    );
    const drawn = ranked.down.get(e.id) === false ? [...points].reverse() : points;
    return [
      { edge: e.id, points: drawn, shape: 'orthogonal', fromSide: sideOf(drawn, 'from'), toSide: sideOf(drawn, 'to') },
    ];
  });
  const index = new Map(routes.map((r, i) => [r.edge, i]));
  const trunks = new Map(
    groups.flatMap((g, i) => (g.kind === 'single' ? [] : g.links.map((l) => [l.edge, `${g.kind}-${i}`] as const))),
  );
  const boxes = spec.nodes.flatMap((n) => {
    const r = rects.get(n.id);
    return r ? [r] : [];
  });
  const labels: EdgeLabel[] = [];
  for (const seat of seats) {
    const l = seat.group.links[0] as Link;
    const port: Point =
      seat.at === 'top'
        ? [ports.bottom.get(l) ?? 0, (rects.get(l.upper)?.y ?? 0) + (rects.get(l.upper)?.h ?? 0)]
        : [ports.top.get(l) ?? 0, rects.get(l.lower)?.y ?? 0];
    const own = new Set(seat.group.links.map((k) => k.edge));
    const clear = { lines: routes, boxes: [...boxes, ...labels.map((x) => x.box)], margin: m.labelGap };
    labels.push(seatLabel(seat, port, index.get(seat.edge.id) ?? 0, m.labelGap, clear, own));
  }
  const nodes = spec.nodes.flatMap((n): PlacedNode[] => {
    const r = rects.get(n.id);
    const row = ranked.layerOf.get(n.id) ?? 0;
    return r ? [{ id: n.id, rect: r, col: layers[row]?.indexOf(n.id) ?? 0, row }] : [];
  });
  const xs = [
    ...nodes.map((n) => n.rect.x + n.rect.w),
    ...labels.map((l) => l.box.x + l.box.w),
    ...routes.flatMap((r) => r.points.map((p) => p[0])),
  ];
  const ys = [
    ...nodes.map((n) => n.rect.y + n.rect.h),
    ...labels.map((l) => l.box.y + l.box.h),
    ...routes.flatMap((r) => r.points.map((p) => p[1])),
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
  return { nodes, routes, labels, trunks, width: Math.max(0, ...xs), bottom: Math.max(m.top, ...ys), placed };
}
