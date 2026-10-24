import type { Point } from '@diagrist/core';
import type { Route } from '@diagrist/layout-grid';
import { labelSegment, labelWidth } from '../labels.js';
import { STATE as S } from '../metrics.js';
import { segmentHits } from '../points/geometry.js';
import { blocking, type RouteContext } from './context.js';
import { orderRailPorts, type RankedRail } from './ports.js';

/** A rail: out, along the rail, back in on the same side. */
interface Rail {
  readonly index: number;
  readonly r: Route;
  /** A horizontal rail (top or bottom) instead of a vertical one. */
  readonly flat: boolean;
  /** -1 left or top, +1 right or bottom. */
  readonly dir: -1 | 1;
  readonly anchor: number;
  readonly span: number;
  readonly lo: number;
  readonly hi: number;
}

const OUTER = { left: -1, top: -1, right: 1, bottom: 1 } as const;

function railOf(r: Route, index: number): Rail | undefined {
  if (r.fromSide !== r.toSide || r.points.length !== 4 || r.shape === 'loop') return undefined;
  const flat = r.fromSide === 'top' || r.fromSide === 'bottom';
  const [p0, p1, p2, p3] = r.points as [Point, Point, Point, Point];
  const k = flat ? 1 : 0;
  const q = flat ? 0 : 1;
  if (p1[k] !== p2[k] || p0[q] !== p1[q] || p2[q] !== p3[q]) return undefined;
  const dir = OUTER[r.fromSide];
  const anchor = dir < 0 ? Math.min(p0[k], p3[k]) : Math.max(p0[k], p3[k]);
  const [lo, hi] = [Math.min(p0[q], p3[q]), Math.max(p0[q], p3[q])];
  return { index, r, flat, dir, anchor, span: hi - lo, lo, hi };
}

/** How far a label reaches across the rail. */
const extent = (lines: readonly string[], flat: boolean): number =>
  lines.length ? (flat ? lines.length * S.labelLineH : labelWidth(lines)) : 0;

/** Labels of straight edges reach left (or up) over the node; the first rail begins behind them. */
function overhang(routes: readonly Route[], rail: Rail, c: RouteContext): number {
  const k = rail.flat ? 1 : 0;
  const q = k === 0 ? 1 : 0;
  return Math.max(
    0,
    ...routes.flatMap((o, i) => {
      if (o.points.length < 2 || railOf(o, 0)) return [];
      const [a, b] = labelSegment(o);
      const loop = o.shape === 'loop';
      const room = S.labelGap + extent(c.lines[i] ?? [], rail.flat) + S.labelGap;
      if (loop && (OUTER[o.fromSide] !== rail.dir || Math.max(a[q], b[q]) < rail.lo || Math.min(a[q], b[q]) > rail.hi))
        return [];
      if (!loop && (rail.dir > 0 || a[k] !== b[k] || a[k] < rail.anchor)) return [];
      return loop ? [room + rail.dir * (a[k] - rail.anchor)] : [room - (a[k] - rail.anchor)];
    }),
  );
}

function moved(rail: Rail, at: number): Point[] {
  const set = (p: Point): Point => (rail.flat ? [p[0], at] : [at, p[1]]);
  const [p0, p1, p2, p3] = rail.r.points as [Point, Point, Point, Point];
  return [p0, set(p1), set(p2), p3];
}

/**
 * Back and skip edges run on rails beside the states. Rails of one side are staggered outward, short ones inside,
 * keeping enough distance that the label of each rail fits between it and the next. A rail that would then meet a
 * foreign node stays where the router laid it.
 */
export function spreadRails(routes: readonly Route[], c: RouteContext): Route[] {
  const rails = routes.flatMap((r, i) => railOf(r, i) ?? []);
  if (!rails.length) return [...routes];
  const out = [...routes];
  const ranked: RankedRail[] = [];
  const placed: { rail: Rail; at: number; room: number }[] = [];
  for (const rail of [...rails].sort((a, b) => a.span - b.span || a.index - b.index)) {
    const own = rail.anchor + rail.dir * (S.laneGap + overhang(routes, rail, c));
    const limits = placed
      .filter((p) => p.rail.r.fromSide === rail.r.fromSide && p.rail.lo < rail.hi && rail.lo < p.rail.hi)
      .map((p) => p.at + rail.dir * p.room);
    const at = rail.dir < 0 ? Math.min(own, ...limits) : Math.max(own, ...limits);
    const points = moved(rail, at);
    if (blocking(c, rail.index).some((rect) => points.slice(1).some((p, i) => segmentHits(points[i] ?? p, p, rect, 2))))
      continue;
    out[rail.index] = { ...rail.r, points };
    const label = extent(c.lines[rail.index] ?? [], rail.flat);
    placed.push({ rail, at, room: Math.max(S.laneGap, label ? label + 2 * S.labelGap + S.laneGap / 2 : 0) });
    ranked.push({ index: rail.index, rank: ranked.length, flat: rail.flat });
  }
  return orderRailPorts(out, ranked, c);
}
