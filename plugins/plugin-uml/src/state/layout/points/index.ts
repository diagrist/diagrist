import { type Point, type Rect, textWidth } from '@diagrist/core';
import type { GridLayout, PlacedNode, Side } from '@diagrist/layout-grid';
import type { StateModel } from '../../model.js';
import { STATE_FONTS as F, STATE as S } from '../metrics.js';
import {
  borderOf,
  bottom,
  cx,
  cy,
  directPartners,
  hits,
  hostOf,
  inFrame,
  nearIcon,
  onDirectLine,
  pointFrame,
  right,
} from './geometry.js';
import { pointPairs } from './pairs.js';

const SIDES: readonly Side[] = ['bottom', 'right', 'left', 'top'];
const OUTWARD = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] } as const;

/** Right-angled way from the point to the middle of its partner, first away from the border. */
function elbow(c: Point, side: Side, to: Rect): Point[] {
  const target: Point = [cx(to), cy(to)];
  return [c, side === 'top' || side === 'bottom' ? [c[0], target[1]] : [target[0], c[1]], target];
}

/** Does the box lie so that a straight line from the point meets it, away from its corners? */
const facing = (r: Rect, at: Point, flat: boolean, corner: number) =>
  flat ? at[0] > r.x + corner && at[0] < right(r) - corner : at[1] > r.y + corner && at[1] < bottom(r) - corner;

/** A place on the border for the middle of the point, keeping `inset` from the corners. */
function spot(frame: Rect, side: Side, along: number, inset: number): Point {
  const flat = side === 'top' || side === 'bottom';
  const [lo, hi] = flat ? [frame.x + inset, right(frame) - inset] : [frame.y + inset, bottom(frame) - inset];
  const t = lo > hi ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, along));
  if (flat) return [t, side === 'top' ? frame.y : bottom(frame)];
  return [side === 'left' ? frame.x : right(frame), t];
}

/**
 * The way round outside, as the router lays a rail: out from the point behind all nodes, along there and across to
 * the partner. Its length beyond the direct distance, undefined when it crosses something.
 */
function railDetour(at: Point, side: Side, target: Rect, rects: readonly Rect[]): number | undefined {
  const gap = 16;
  const all = [...rects, target];
  const [tx, ty] = [cx(target), cy(target)];
  const across = side === 'left' || side === 'right';
  const edge =
    side === 'left'
      ? Math.min(at[0], ...all.map((r) => r.x)) - gap
      : side === 'right'
        ? Math.max(at[0], ...all.map(right)) + gap
        : side === 'top'
          ? Math.min(at[1], ...all.map((r) => r.y)) - gap
          : Math.max(at[1], ...all.map(bottom)) + gap;
  const path: Point[] = across
    ? [at, [edge, at[1]], [edge, ty], [side === 'left' ? target.x : right(target), ty]]
    : [at, [at[0], edge], [tx, edge], [tx, side === 'top' ? target.y : bottom(target)]];
  if (hits(path, rects)) return undefined;
  const length = path
    .slice(1)
    .reduce((n, p, i) => n + Math.abs(p[0] - (path[i]?.[0] ?? 0)) + Math.abs(p[1] - (path[i]?.[1] ?? 0)), 0);
  return Math.max(0, length - Math.abs(tx - at[0]) - Math.abs(ty - at[1]));
}

/** The node of a point: a box of `point` around the place, in the grid cell it falls into. */
function pointNode(id: string, at: Point, grid: GridLayout): PlacedNode {
  const half = S.point / 2;
  const track = (starts: readonly number[], v: number) => Math.max(0, starts.filter((x) => x <= v).length - 1);
  const col = track(
    grid.cols.map((c) => c.x),
    at[0],
  );
  const row = track(
    grid.rows.map((r) => r.y),
    at[1],
  );
  return { id, rect: { x: at[0] - half, y: at[1] - half, w: S.point, h: S.point }, col, row };
}

/** Score of a place for a single point: ways to its partners, straight preferred, nothing crossed, name kept free. */
function score(
  m: StateModel,
  id: string,
  at: Point,
  side: Side,
  rect: Rect,
  nodes: readonly PlacedNode[],
  taken: readonly Point[],
) {
  const border = borderOf(m, id);
  const host = hostOf(m, id);
  const flat = side === 'top' || side === 'bottom';
  let sum = 0;
  for (const t of m.diagram.transitions) {
    const other = t.from === id ? t.to : t.to === id ? t.from : undefined;
    const p = other === undefined || other === id ? undefined : nodes.find((n) => n.id === other);
    if (!p || other === undefined) continue;
    const inner = border !== undefined && inFrame(m, other, border);
    const others = nodes.filter((n) => n.id !== other && n.id !== id && n.id !== host).map((n) => n.rect);
    const [dx, dy] = OUTWARD[side];
    const beyond = (cx(p.rect) - at[0]) * dx + (cy(p.rect) - at[1]) * dy > 0;
    sum += Math.abs(cx(p.rect) - at[0]) + Math.abs(cy(p.rect) - at[1]);
    const bent = border
      ? Math.abs(cx(p.rect) - at[0]) > 1 && Math.abs(cy(p.rect) - at[1]) > 1
      : !facing(p.rect, at, flat, S.step);
    if (bent) sum += inner ? 160 : 60;
    if (!inner && !beyond) sum += 400;
    const crossed = inner || beyond ? hits(elbow(at, side, p.rect), others) : 0;
    const detour = crossed && !border ? railDetour(at, side, p.rect, others) : undefined;
    sum += detour ?? 1000 * crossed;
  }
  const title = border ? textWidth(m.vertices.get(border)?.label ?? '', F.name) : 0;
  if (border && side === 'top' && Math.abs(at[0] - cx(rect)) < title / 2 + S.point) sum += 500;
  if (host && nearIcon(rect, at, side)) sum += 500;
  if (host) sum += onDirectLine(rect, at, side, directPartners(m, host, nodes));
  if (taken.some((q) => Math.abs(q[0] - at[0]) + Math.abs(q[1] - at[1]) < 3 * S.point)) sum += 2000;
  return sum;
}

/**
 * Entry and exit points onto the border of their state: at the side and place from which the ways inside and
 * outside are shortest and cross no foreign node. Partners outside lie outside; the middle of the top carries the
 * name. Points joined to each other face each other first.
 */
export function placeBorderPoints(m: StateModel, grid: GridLayout): GridLayout {
  const nodes = [...grid.nodes];
  const taken: Point[] = [];
  const put = (id: string, at: Point) => {
    taken.push(at);
    nodes.push(pointNode(id, at, grid));
  };
  const paired = new Set<string>();
  for (const pair of pointPairs(m, grid))
    for (const end of [pair.from, pair.to]) {
      put(end.id, end.at);
      paired.add(end.id);
    }
  for (const v of m.diagram.vertices) {
    if (paired.has(v.id)) continue;
    const rect = pointFrame(m, v.id, grid);
    if (!rect || (!borderOf(m, v.id) && !hostOf(m, v.id))) continue;
    const peers = m.diagram.transitions
      .flatMap((t) => (t.from === v.id ? [t.to] : t.to === v.id ? [t.from] : []))
      .flatMap((id) => nodes.find((n) => n.id === id)?.rect ?? []);
    let best: { at: Point; score: number } | undefined;
    for (const side of SIDES) {
      const flat = side === 'top' || side === 'bottom';
      const alongs = [...peers.map((p) => (flat ? cx(p) : cy(p))), flat ? cx(rect) : cy(rect)];
      if (!borderOf(m, v.id))
        for (const p of peers) {
          const [lo, hi] = flat ? [p.x, right(p)] : [p.y, bottom(p)];
          alongs.push(lo + S.step + 2, hi - S.step - 2);
        }
      for (const along of alongs) {
        const at = spot(rect, side, along, S.radius + S.point);
        const s = score(m, v.id, at, side, rect, nodes, taken);
        if (!best || s < best.score) best = { at, score: s };
      }
    }
    if (best) put(v.id, best.at);
  }
  return { ...grid, nodes };
}
