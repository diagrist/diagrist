import type { Point, Rect } from '@diagrist/core';
import { bottom, type GridLayout, overlaps, right, type Side } from '@diagrist/layout-grid';
import type { StateModel } from '../../model.js';
import { POINT_PENALTY as P, STATE as S } from '../metrics.js';
import { borderOf, hostOf, pointFrame, segmentHits } from './geometry.js';
import { plus, pointPenalties } from './penalty.js';

/** One end of a pair: the point, where it sits, and on which side. */
export interface PointEnd {
  readonly id: string;
  readonly at: Point;
  readonly side: Side;
}

function facingSides(a: Rect, b: Rect): { sides: [Side, Side]; flat: boolean } | undefined {
  if (b.y >= bottom(a)) return { sides: ['bottom', 'top'], flat: true };
  if (a.y >= bottom(b)) return { sides: ['top', 'bottom'], flat: true };
  if (b.x >= right(a)) return { sides: ['right', 'left'], flat: false };
  if (a.x >= right(b)) return { sides: ['left', 'right'], flat: false };
  return undefined;
}

const holds = (o: Rect, i: Rect) => o.x <= i.x && right(o) >= right(i) && o.y <= i.y && bottom(o) >= bottom(i);
const edgeOf = (r: Rect, side: Side) =>
  side === 'top' ? r.y : side === 'bottom' ? bottom(r) : side === 'left' ? r.x : right(r);

interface Candidate {
  readonly path: readonly Point[];
  readonly sides: readonly [Side, Side];
  readonly cost: number;
}

/** Straight lines between the facing sides, one per half point width of the shared part; else only the middle. */
function straight(a: Rect, b: Rect, inset: number): Candidate[] {
  const face = facingSides(a, b);
  if (!face) return [];
  const [lo, hi] = face.flat
    ? [Math.max(a.x, b.x) + inset, Math.min(right(a), right(b)) - inset]
    : [Math.max(a.y, b.y) + inset, Math.min(bottom(a), bottom(b)) - inset];
  const [ea, eb] = [edgeOf(a, face.sides[0]), edgeOf(b, face.sides[1])];
  const line = (at: number, cost: number): Candidate => ({
    path: face.flat
      ? [
          [at, ea],
          [at, eb],
        ]
      : [
          [ea, at],
          [eb, at],
        ],
    sides: face.sides,
    cost,
  });
  if (lo > hi) return hi - lo + 2 * inset >= 2 * S.point ? [line((lo + hi) / 2, 0)] : [];
  const out: Candidate[] = [];
  for (let c = lo; c <= hi + 0.5; c += S.point / 2)
    out.push(line(Math.min(c, hi), Math.abs(Math.min(c, hi) - (lo + hi) / 2)));
  return out;
}

/** A short bend through the gap when the straight line does not fit: both points on one side, at the facing corners. */
function bend(a: Rect, b: Rect, inset: number): Candidate[] {
  const face = facingSides(a, b);
  if (!face) return [];
  const across: [Side, Side] = face.flat ? ['right', 'left'] : ['bottom', 'top'];
  const forward = face.sides[0] === 'right' || face.sides[0] === 'bottom';
  return across.map((side, i) => {
    const out = side === 'right' || side === 'bottom' ? 1 : -1;
    const along = (r: Rect, near: boolean) => {
      const far = near === forward;
      if (face.flat) return far ? bottom(r) - inset : r.y + inset;
      return far ? right(r) - inset : r.x + inset;
    };
    const edge = (r: Rect) => edgeOf(r, side);
    const depth = (out > 0 ? Math.max(edge(a), edge(b)) : Math.min(edge(a), edge(b))) + out * S.step;
    const [u, v] = [along(a, true), along(b, false)];
    const path: Point[] = face.flat
      ? [
          [edge(a), u],
          [depth, u],
          [depth, v],
          [edge(b), v],
        ]
      : [
          [u, edge(a)],
          [u, depth],
          [v, depth],
          [v, edge(b)],
        ];
    return { path, sides: [side, side] as const, cost: P.bend + P.bendNext * i };
  });
}

/** The ends of a transition between two points: the ids, and the rectangles they sit on. */
interface Ends {
  readonly from: string;
  readonly to: string;
  readonly a: Rect;
  readonly b: Rect;
}

/**
 * The cheapest straight line or bend between two points that crosses no other node and no frame that holds neither
 * end: its own cost plus the penalties of both ends. The first of equal costs wins.
 */
function cheapest(
  m: StateModel,
  { from, to, a, b }: Ends,
  grid: GridLayout,
  taken: readonly Point[],
): { c: Candidate; score: number } | undefined {
  const inset = S.radius + S.point;
  const hosts = [hostOf(m, from), hostOf(m, to)];
  const others = [
    ...grid.nodes.filter((n) => ![from, to, ...hosts].includes(n.id)).map((n) => n.rect),
    ...grid.groups.map((g) => g.rect).filter((r) => r !== a && r !== b && !holds(r, a) && !holds(r, b)),
  ];
  const clear = (c: Candidate) =>
    !c.path.slice(1).some((x, i) => others.some((r) => segmentHits(c.path[i] ?? x, x, r, 2)));
  const penalties = (id: string, rect: Rect, at: Point | undefined, side: Side) =>
    at === undefined ? [] : pointPenalties(m, id, { rect, at, side }, grid.nodes, taken);
  let best: { c: Candidate; score: number } | undefined;
  for (const c of [...straight(a, b, inset), ...bend(a, b, inset)].filter(clear)) {
    const ends = [...penalties(from, a, c.path[0], c.sides[0]), ...penalties(to, b, c.path.at(-1), c.sides[1])];
    const score = plus(c.cost, ends);
    if (!best || score < best.score) best = { c, score };
  }
  return best;
}

/**
 * Transitions between points of two states side by side or one behind the other: both points sit on the facing
 * sides at the same place and the line runs straight across; sides too short take a short bend through the gap.
 * A pair whose best place is taken by another point is left to the single placement.
 */
export function pointPairs(m: StateModel, grid: GridLayout): { from: PointEnd; to: PointEnd }[] {
  const pairs: { from: PointEnd; to: PointEnd }[] = [];
  const taken: Point[] = [];
  const used = new Set<string>();
  const isPoint = (id: string) => borderOf(m, id) !== undefined || hostOf(m, id) !== undefined;
  for (const { from, to } of m.diagram.transitions) {
    const [a, b] = [pointFrame(m, from, grid), pointFrame(m, to, grid)];
    if (!isPoint(from) || !isPoint(to) || !a || !b || used.has(from) || used.has(to) || overlaps(a, b)) continue;
    const best = cheapest(m, { from, to, a, b }, grid, taken);
    const [u, v] = [best?.c.path[0], best?.c.path.at(-1)];
    if (!best || best.score >= P.taken || !u || !v) continue;
    pairs.push({ from: { id: from, at: u, side: best.c.sides[0] }, to: { id: to, at: v, side: best.c.sides[1] } });
    taken.push(u, v);
    used.add(from).add(to);
  }
  return pairs;
}
