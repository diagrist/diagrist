import type { Point, Rect } from '@diagrist/core';
import {
  bottom,
  cx,
  cy,
  type EdgeLabel,
  type GridLayout,
  type Pads,
  type Route,
  right,
  type Side,
} from '@diagrist/layout-grid';
import { regionsOf, type StateModel } from '../model.js';
import { labelWidth } from './labels.js';
import { STATE as S } from './metrics.js';
import { borderOf, borderSide, inFrame } from './points/geometry.js';
import { regionArt, regionNameRoom } from './regions.js';

/** What a growth pass reads of a laid out picture. */
export interface Pass {
  readonly before: GridLayout;
  readonly after: GridLayout;
  readonly routes: readonly Route[];
  readonly labels: readonly EdgeLabel[];
  readonly ends: readonly { readonly from: string; readonly to: string }[];
  readonly lines: readonly (readonly string[])[];
}

const none = (): Record<Side, number> => ({ top: 0, bottom: 0, left: 0, right: 0 });
const within = (r: Rect, x: number, y: number) => x > r.x + 1 && x < right(r) - 1 && y > r.y + 1 && y < bottom(r) - 1;

/**
 * Empty room between the content of a frame and its border beyond the usual pads: nodes, lines and labels inside. A
 * second pass gives this much back, for instance when a rail with its label moves to the other side.
 */
function slack(m: StateModel, id: string, rect: Rect, p: Pass): Record<Side, number> {
  const own = (n: string) => borderOf(m, n) === id;
  const toPoint = (i: number) => {
    const e = p.ends[i];
    const r = p.routes[i];
    return e && r && (own(e.from) || own(e.to)) && r.points.some(([x, y]) => within(rect, x, y));
  };
  const rects: Rect[] = [
    ...p.after.nodes.filter((n) => !own(n.id) && within(rect, cx(n.rect), cy(n.rect))).map((n) => n.rect),
    ...p.after.groups.filter((g) => g.id !== id && within(rect, cx(g.rect), cy(g.rect))).map((g) => g.rect),
    ...p.routes.flatMap((r) => r.points.filter(([x, y]) => within(rect, x, y)).map(([x, y]) => ({ x, y, w: 0, h: 0 }))),
    ...p.labels.filter((l) => within(rect, cx(l.box), cy(l.box)) || toPoint(l.route)).map((l) => l.box),
  ];
  if (!rects.length) return none();
  const [x, y] = [Math.min(...rects.map((r) => r.x)), Math.max(...rects.map(bottom))];
  return {
    top: 0,
    left: x - S.padSide - rect.x,
    right: right(rect) - S.padSide - Math.max(...rects.map(right)),
    bottom: bottom(rect) - S.padBottom - y,
  };
}

/** Room a transition between the inside and a point needs on its last piece: for the head and its label. */
function labelRoom(lines: readonly string[], flat: boolean): number {
  const least = 3 * S.laneGap;
  if (!lines.length) return least;
  const text = flat ? labelWidth(lines) + 2 * S.labelAir : lines.length * S.labelLineH + 2 * S.labelAir;
  return Math.max(least, text);
}

const length = (a: Point, b: Point) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

/**
 * How much composite states must grow after a pass: as far as the labels of their inside widened them, so far that
 * the label of a transition to a border point fits beside its state, and so far that the name of the last region
 * fits. With these pads the layout runs again; undefined when nothing grows.
 */
export function frameGrowth(m: StateModel, p: Pass, pads: ReadonlyMap<string, Pads>): Map<string, Pads> | undefined {
  const delta = new Map<string, Record<Side, number>>();
  for (const g of p.after.groups) {
    const last = regionArt(g, m, p.after, p.ends, p.labels).names.at(-1);
    const short = last ? last.x + regionNameRoom(last.text) - S.padX - right(g.rect) : 0;
    if (short >= 1) delta.set(g.id, { ...none(), right: short });
  }
  const points = p.after.nodes.filter((n) => borderOf(m, n.id));
  if (!points.length && !delta.size) return undefined;
  const slacks = new Map<string, Record<Side, number>>();
  for (const id of new Set(points.flatMap((n) => borderOf(m, n.id) ?? []))) {
    const a = p.before.groups.find((g) => g.id === id)?.rect;
    const b = p.after.groups.find((g) => g.id === id)?.rect;
    if (!a || !b) continue;
    const extra = delta.get(id)?.right ?? 0;
    const s = regionsOf(m, id).length ? none() : slack(m, id, b, p);
    slacks.set(id, s);
    delta.set(id, {
      top: 0,
      left: a.x - b.x - s.left,
      right: right(b) - right(a) + extra - s.right,
      bottom: bottom(b) - bottom(a) - s.bottom,
    });
  }
  const roomed = new Set<string>();
  p.routes.forEach((r, i) => {
    const e = p.ends[i];
    if (!e || r.points.length < 2) return;
    for (const [end, other, at] of [
      [e.from, e.to, 0],
      [e.to, e.from, r.points.length - 1],
    ] as const) {
      const border = borderOf(m, end);
      const side = border ? borderSide(m, end, p.after) : undefined;
      if (!border || !side || !inFrame(m, other, border) || r.points.length > 3) continue;
      const next = r.points[at === 0 ? 1 : at - 1];
      const tip = r.points[at];
      if (!next || !tip) continue;
      const room =
        labelRoom(p.lines[i] ?? [], side === 'left' || side === 'right') - (r.unroutable ? 0 : length(tip, next));
      const d = delta.get(border) ?? none();
      const key = `${border}:${side}`;
      if (!roomed.has(key)) d[side] += slacks.get(border)?.[side] ?? 0;
      roomed.add(key);
      d[side] += room;
      delta.set(border, d);
    }
  });
  const old = (id: string, s: Side) => pads.get(id)?.[s] ?? 0;
  const sides: Side[] = ['top', 'bottom', 'left', 'right'];
  const grown = [...delta].some(([id, d]) =>
    sides.some((s) => Math.abs(Math.max(0, old(id, s) + d[s]) - old(id, s)) >= 1),
  );
  if (!grown) return undefined;
  const out = new Map(pads);
  for (const [id, d] of delta) {
    const add = (s: Side) => Math.max(0, old(id, s) + Math.ceil(d[s]));
    out.set(id, { top: add('top'), bottom: add('bottom'), left: add('left'), right: add('right') });
  }
  return out;
}
