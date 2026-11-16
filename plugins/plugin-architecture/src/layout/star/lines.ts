import type { Point, Rect } from '@diagrist/core';
import type { ArchEdge } from '../../model/types.js';
import { bowed, clipped, lineMeets, linesCross } from './geometry.js';
import { coverOf, middleOf, type Placement, type Spot } from './place.js';
import { hubPorts, type Port, spokeWay } from './ports.js';

/** How far apart the lines of edges between the same two nodes run. */
const PAIR_GAP = 24;
/** How far a line keeps from boxes it does not end at. */
const CLEAR = 10;
/** How far a line between neighbours keeps from the hub. */
const HUB_CLEAR = 24;
/** How far a line between neighbours bows out, in shares of its length, tried in this order. */
const BOWS = [0.12, 0.2, 0.3, 0.42, 0.56, 0.72];

/** The line of an edge: its points from source to target, which side of the pair it runs on, and whether it is clear. */
export interface StarLine {
  readonly edge: ArchEdge;
  readonly points: readonly Point[];
  /** The side of its straight way the line was moved to, beside another edge between the same nodes, or 0. */
  readonly side: number;
  readonly clear: boolean;
  /** For a line at the hub: whether it starts there, else it ends there. */
  readonly fromHub?: boolean;
}

/** The shift of each edge to the left of the way between its pair, so edges between the same nodes run apart. */
function shifts(edges: readonly ArchEdge[]): Map<number, { a: string; b: string; by: number }> {
  const pairs = new Map<string, ArchEdge[]>();
  for (const e of edges) {
    const key = [e.from, e.to].sort().join('\u0000');
    pairs.set(key, [...(pairs.get(key) ?? []), e]);
  }
  const out = new Map<number, { a: string; b: string; by: number }>();
  for (const list of pairs.values()) {
    const first = list[0] as ArchEdge;
    list.forEach((e, k) => {
      out.set(e.index, { a: first.from, b: first.to, by: (k - (list.length - 1) / 2) * PAIR_GAP });
    });
  }
  return out;
}

/** Whether a line runs into a node it does not end at, or through a frame or head that holds neither end. */
function hits(points: readonly Point[], ends: readonly string[], placed: Placement, hub: string): boolean {
  for (const [id, s] of placed.spots) {
    if (ends.includes(id)) continue;
    const pad = id === hub ? HUB_CLEAR : CLEAR;
    if (coverOf(s).some((r) => lineMeets(points, r, pad))) return true;
  }
  return placed.frames.some(
    (f) =>
      (f.head !== undefined && lineMeets(points, f.head, CLEAR)) ||
      (!ends.some((id) => f.members.includes(id)) && lineMeets(points, f.rect)),
  );
}

/** A way between two middles, moved `by` to the left of the way from `a` to `b`. */
function moved(pa: Point, pb: Point, by: number): [Point, Point] {
  const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
  const n: Point = [((pb[1] - pa[1]) / len) * by, (-(pb[0] - pa[0]) / len) * by];
  return [
    [pa[0] + n[0], pa[1] + n[1]],
    [pb[0] + n[0], pb[1] + n[1]],
  ];
}

/**
 * The lines of a placement: straight from middle to middle, cut at the outlines, edges between the same nodes moved
 * apart side by side. A line between two neighbours that would run through the hub, a node or another line bows
 * out, away from the hub, as little as clears it.
 */
export function linesOf(edges: readonly ArchEdge[], placed: Placement, hub: string): StarLine[] {
  const drawn = edges.filter((e) => e.from !== e.to && placed.spots.has(e.from) && placed.spots.has(e.to));
  const shift = shifts(drawn);
  const spoke = (e: ArchEdge) => e.from === hub || e.to === hub;
  const ends = (e: ArchEdge) => {
    const s = shift.get(e.index) ?? { a: e.from, b: e.to, by: 0 };
    const a = placed.spots.get(s.a) as Spot;
    const b = placed.spots.get(s.b) as Spot;
    return { s, a, b, way: moved(middleOf(a), middleOf(b), s.by) };
  };
  const cut = (way: readonly Point[], a: Spot, b: Spot, forward: boolean) => {
    const pts = clipped(way, coverOf(a), coverOf(b));
    return forward ? pts : [...pts].reverse();
  };
  const hubSpot = placed.spots.get(hub) as Spot;
  const keyOf = (s: { a: string; b: string }) => `${s.a}\u0000${s.b}`;
  const farOf = (s: { a: string; b: string }) => middleOf(placed.spots.get(s.a === hub ? s.b : s.a) as Spot);
  const ports =
    hubSpot.shape.parts.length === 1
      ? hubPorts(
          coverOf(hubSpot)[0] as Rect,
          new Map(
            drawn.filter(spoke).map((e) => {
              const s = shift.get(e.index) ?? { a: e.from, b: e.to, by: 0 };
              const lines = drawn.filter((x) => keyOf(shift.get(x.index) ?? s) === keyOf(s)).length;
              return [keyOf(s), { far: farOf(s), lines }] as const;
            }),
          ),
        )
      : new Map<string, Port>();
  const spokes = drawn.filter(spoke).map((e): StarLine => {
    const { s, a, b } = ends(e);
    const way = spokeWay(ports.get(keyOf(s)), middleOf(hubSpot), farOf(s), s.by, s.a === hub);
    const points = cut(way, a, b, s.a === e.from);
    return {
      edge: e,
      points,
      side: Math.sign(s.by) * (s.a === e.from ? 1 : -1),
      clear: !hits(points, [e.from, e.to], placed, hub),
      fromHub: e.from === hub,
    };
  });
  const hubAt = middleOf(placed.spots.get(hub) as Spot);
  const others: StarLine[] = [];
  for (const e of drawn.filter((x) => !spoke(x))) {
    const { s, a, b, way } = ends(e);
    const forward = s.a === e.from;
    const [pa, pb] = way;
    const mid: Point = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
    const len = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    const left: Point = [(pb[1] - pa[1]) / (len || 1), -(pb[0] - pa[0]) / (len || 1)];
    const away = left[0] * (mid[0] - hubAt[0]) + left[1] * (mid[1] - hubAt[1]) >= 0 ? 1 : -1;
    const tries = [[pa, pb], ...BOWS.map((k) => bowed(pa, pb, away * k * len))];
    const lines = [...spokes, ...others].map((l) => l.points);
    const options = tries.map((t) => cut(t, a, b, forward));
    const ok = (p: readonly Point[]) => !hits(p, [e.from, e.to], placed, hub) && !lines.some((l) => linesCross(p, l));
    const best = options.find(ok);
    const side = Math.sign(s.by) * (forward ? 1 : -1);
    others.push({ edge: e, points: best ?? (options.at(-1) as Point[]), side, clear: best !== undefined });
  }
  const byIndex = new Map([...spokes, ...others].map((l) => [l.edge.index, l]));
  return drawn.map((e) => byIndex.get(e.index) as StarLine);
}

/** Every rectangle a picture's nodes and frames cover, for texts to keep out of. */
export const coveredBy = (placed: Placement): Rect[] => [
  ...[...placed.spots.values()].flatMap(coverOf),
  ...placed.frames.flatMap((f) => (f.head ? [f.head] : [])),
];
