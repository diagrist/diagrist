import { type Point, type Rect, textWidth } from '@diagrist/core';
import type { GridLayout, Side } from '@diagrist/layout-grid';
import type { StateModel } from '../../model.js';
import { STATE_FONTS as F, STATE as S } from '../metrics.js';
import {
  borderOf,
  bottom,
  cx,
  directPartners,
  hostOf,
  nearIcon,
  onDirectLine,
  pointFrame,
  right,
  segmentHits,
} from './geometry.js';

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
const overlaps = (a: Rect, b: Rect) => a.x < right(b) && right(a) > b.x && a.y < bottom(b) && bottom(a) > b.y;

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
    const along = (r: Rect, near: boolean) =>
      face.flat
        ? near === forward
          ? bottom(r) - inset
          : r.y + inset
        : near === forward
          ? right(r) - inset
          : r.x + inset;
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
    return { path, sides: [side, side] as const, cost: 100 + 10 * i };
  });
}

/**
 * Transitions between points of two states side by side or one behind the other: both points sit on the facing
 * sides at the same place and the line runs straight across; sides too short take a short bend through the gap.
 */
export function pointPairs(m: StateModel, grid: GridLayout): { from: PointEnd; to: PointEnd }[] {
  const pairs: { from: PointEnd; to: PointEnd }[] = [];
  const taken: Point[] = [];
  const used = new Set<string>();
  const inset = S.radius + S.point;
  const isPoint = (id: string) => borderOf(m, id) !== undefined || hostOf(m, id) !== undefined;
  for (const t of m.diagram.transitions) {
    const [a, b] = [pointFrame(m, t.from, grid), pointFrame(m, t.to, grid)];
    if (!isPoint(t.from) || !isPoint(t.to) || !a || !b || used.has(t.from) || used.has(t.to) || overlaps(a, b))
      continue;
    const hosts = [hostOf(m, t.from), hostOf(m, t.to)];
    const others = [
      ...grid.nodes.filter((n) => ![t.from, t.to, ...hosts].includes(n.id)).map((n) => n.rect),
      ...grid.groups.map((g) => g.rect).filter((r) => r !== a && r !== b && !holds(r, a) && !holds(r, b)),
    ];
    let best: { c: Candidate; score: number } | undefined;
    for (const c of [...straight(a, b, inset), ...bend(a, b, inset)]) {
      if (c.path.slice(1).some((x, i) => others.some((r) => segmentHits(c.path[i] ?? x, x, r, 2)))) continue;
      let score = c.cost;
      for (const [id, rect, at, side] of [
        [t.from, a, c.path[0], c.sides[0]],
        [t.to, b, c.path.at(-1), c.sides[1]],
      ] as const) {
        if (!at) continue;
        const host = hostOf(m, id);
        if (host) {
          score += onDirectLine(rect, at, side, directPartners(m, host, grid.nodes));
          if (nearIcon(rect, at, side)) score += 500;
        } else if (side === 'top') {
          const title = m.vertices.get(borderOf(m, id) ?? '')?.label ?? '';
          if (Math.abs(at[0] - cx(rect)) < textWidth(title, F.name) / 2 + S.point) score += 500;
        }
        if (taken.some((x) => Math.abs(x[0] - at[0]) + Math.abs(x[1] - at[1]) < 3 * S.point)) score += 2000;
      }
      if (!best || score < best.score) best = { c, score };
    }
    const [u, v] = [best?.c.path[0], best?.c.path.at(-1)];
    if (!best || best.score >= 2000 || !u || !v) continue;
    pairs.push({ from: { id: t.from, at: u, side: best.c.sides[0] }, to: { id: t.to, at: v, side: best.c.sides[1] } });
    taken.push(u, v);
    used.add(t.from).add(t.to);
  }
  return pairs;
}
