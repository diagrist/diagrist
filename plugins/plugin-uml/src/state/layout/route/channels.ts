import type { Point, Rect } from '@diagrist/core';
import { type Route, type StackedLine, stackedPorts, stackedTracks } from '@diagrist/layout-grid';
import { isBorderPoint, type StateModel } from '../../model.js';
import { endBox } from '../ends.js';
import { STATE as S } from '../metrics.js';
import type { RouteContext } from './context.js';
import { clashes } from './steps.js';

/** Vertices whose lines may leave and enter anywhere along a side; every other one only in its middle. */
const SPREAD: ReadonlySet<string> = new Set(['state', 'fork', 'join']);

/** A forward transition in the turned frame, where the flow runs down: its line and both boxes. */
interface Forward {
  readonly index: number;
  readonly line: StackedLine;
  readonly upper: Rect;
  readonly lower: Rect;
}

type Ports = { top: Map<string, number>; bottom: Map<string, number> };

const bottomOf = (r: Rect) => r.y + r.h;
/** Keeps ends off the corners: as far as two ends stand apart, less on a short side, so three fit on a state. */
const inset = (r: Rect) => Math.min(S.laneGap, r.w / 6);

/** Do both ends stand side by side in one scope, neither on a border? Then the line runs in the gap between them. */
function siblings(m: StateModel, from: string, to: string): boolean {
  const [a, b] = [m.vertices.get(from), m.vertices.get(to)];
  return (
    a !== undefined && b !== undefined && a.parent === b.parent && !isBorderPoint(a.kind) && !isBorderPoint(b.kind)
  );
}

/** The forward transitions: leaving after the flow and entering before it, between siblings, the target ahead. */
function forwards(routes: readonly Route[], c: RouteContext, turn: (r: Rect) => Rect, sides: [string, string]) {
  const out: Forward[] = [];
  routes.forEach((r, index) => {
    const e = c.ends[index];
    if (!e || e.from === e.to || r.fromSide !== sides[0] || r.toSide !== sides[1] || !siblings(c.m, e.from, e.to))
      return;
    const [a, b] = [endBox(e.from, c.grid), endBox(e.to, c.grid)];
    if (!a || !b) return;
    const [upper, lower] = [turn(a.rect), turn(b.rect)];
    if (lower.y < bottomOf(upper)) return;
    const narrow = (id: string, r: Rect, frame: boolean): Rect =>
      frame || SPREAD.has(c.m.kind(id) ?? '') ? r : { ...r, x: r.x + r.w / 2, w: 0 };
    out.push({
      index,
      line: { id: String(index), upper: a.id, lower: b.id },
      upper: narrow(a.id, upper, a.frame),
      lower: narrow(b.id, lower, b.frame),
    });
  });
  const crowded = (f: Forward) =>
    [
      [f.upper, out.filter((g) => g.line.upper === f.line.upper)],
      [f.lower, out.filter((g) => g.line.lower === f.line.lower)],
    ].some(([r, peers]) => (r as Rect).w === 0 && (peers as Forward[]).length > 1);
  return out.filter((f) => !crowded(f));
}

/**
 * An end alone on its side moves so its line runs straight, else into the middle of its box, else at least `lead`
 * aside: no small Z (Q6). The end on the lower box moves first, then the one on the upper box.
 */
function unjog(items: readonly Forward[], ports: Ports): void {
  for (const f of items) {
    const id = f.line.id;
    const [b, t] = [ports.bottom.get(id) ?? 0, ports.top.get(id) ?? 0];
    if (b === t || Math.abs(b - t) >= S.lead) continue;
    const ends: [Map<string, number>, Rect, number, number, (g: Forward) => boolean][] = [
      [ports.top, f.lower, t, b, (g) => g.line.lower === f.line.lower],
      [ports.bottom, f.upper, b, t, (g) => g.line.upper === f.line.upper],
    ];
    for (const [side, rect, own, other, peer] of ends) {
      if (items.filter(peer).length > 1) continue;
      const [lo, hi] = [rect.x + inset(rect), rect.x + rect.w - inset(rect)];
      const fits = (v: number) => v >= lo && v <= hi;
      const centre = Math.round(rect.x + rect.w / 2);
      const valid = (v: number) => fits(v) && (v === other || Math.abs(v - other) >= S.lead);
      const near = [other - S.lead, other + S.lead, lo, hi]
        .filter(valid)
        .sort((p, q) => Math.abs(p - own) - Math.abs(q - own));
      const best = [other, centre, ...near].find(valid);
      if (best === undefined) continue;
      side.set(id, best);
      break;
    }
  }
}

/** Gaps of forward lines that must share tracks: their runs between the boxes overlap along the flow. */
function bands(items: readonly Forward[]): Forward[][] {
  const sorted = [...items].sort((a, b) => bottomOf(a.upper) - bottomOf(b.upper) || a.index - b.index);
  const out: { lo: number; hi: number; items: Forward[] }[] = [];
  for (const f of sorted) {
    const [lo, hi] = [bottomOf(f.upper), f.lower.y];
    const last = out.at(-1);
    if (last && lo < last.hi && Math.min(hi, last.hi) > Math.max(lo, last.lo)) {
      last.lo = Math.max(last.lo, lo);
      last.hi = Math.min(last.hi, hi);
      last.items.push(f);
    } else out.push({ lo, hi, items: [f] });
  }
  return out.map((b) => b.items);
}

/**
 * Forward transitions between states of one scope run through the channel router of `layout-grid` (plan 4.4): the
 * ends on a side ordered by the other end, lone ends following the other end so the line runs straight, no small
 * steps, and the steps of one gap on tracks in the order that crosses least, centred in the gap. Ends that other
 * lines already use stay apart, and a line that would then touch a foreign box or lie on another line stays as the
 * grid laid it.
 */
export function channelSteps(routes: readonly Route[], c: RouteContext): Route[] {
  const down = c.m.diagram.direction === 'down';
  const turn = (r: Rect): Rect => (down ? r : { x: r.y, y: r.x, w: r.h, h: r.w });
  const back = (x: number, y: number): Point => (down ? [x, y] : [y, x]);
  const items = forwards(routes, c, turn, down ? ['bottom', 'top'] : ['right', 'left']);
  if (!items.length) return [...routes];
  const rects = new Map(
    items.flatMap((f): [string, Rect][] => [
      [f.line.upper, f.upper],
      [f.line.lower, f.lower],
    ]),
  );
  const found = stackedPorts(
    items.map((f) => f.line),
    rects,
    S.laneGap,
    inset,
  );
  const ports: Ports = { top: new Map(found.top), bottom: new Map(found.bottom) };
  unjog(items, ports);
  const taken = foreignEnds(routes, items, c, down);
  const out = [...routes];
  for (const band of bands(items)) {
    const free = band.filter((f) => {
      const [b, t] = [ports.bottom.get(f.line.id) ?? 0, ports.top.get(f.line.id) ?? 0];
      return !near(taken, `${f.line.upper}|bottom`, b) && !near(taken, `${f.line.lower}|top`, t);
    });
    const { track, count } = stackedTracks(
      free.map((f) => f.line),
      ports,
    );
    const lo = Math.max(...free.map((f) => bottomOf(f.upper)));
    const hi = Math.min(...free.map((f) => f.lower.y));
    const first = Math.round((lo + hi) / 2 - ((count - 1) * S.laneGap) / 2);
    for (const f of free) {
      const [b, t] = [ports.bottom.get(f.line.id) ?? 0, ports.top.get(f.line.id) ?? 0];
      const y = first + (track.get(f.line.id) ?? 0) * S.laneGap;
      const [y1, y2] = [bottomOf(f.upper), f.lower.y];
      const points = b === t ? [back(b, y1), back(t, y2)] : [back(b, y1), back(b, y), back(t, y), back(t, y2)];
      const r = out[f.index];
      if (!r || clashes(points, f.index, out, c)) continue;
      out[f.index] = { ...r, points, shape: b === t ? 'straight' : 'orthogonal' };
    }
  }
  return out;
}

/** Where lines that are not forward ones meet the sides forward lines use, by `<box>|<side>` in the turned frame. */
function foreignEnds(routes: readonly Route[], items: readonly Forward[], c: RouteContext, down: boolean) {
  const own = new Set(items.map((f) => f.index));
  const turned: Record<string, string> = down ? { bottom: 'bottom', top: 'top' } : { right: 'bottom', left: 'top' };
  const out = new Map<string, number[]>();
  routes.forEach((r, i) => {
    const e = c.ends[i];
    if (own.has(i) || !e) return;
    const ends: [string, string, Point | undefined][] = [
      [e.from, r.fromSide, r.points[0]],
      [e.to, r.toSide, r.points.at(-1)],
    ];
    for (const [id, side, p] of ends) {
      const box = endBox(id, c.grid)?.id;
      const s = turned[side];
      if (!box || !s || !p) continue;
      const key = `${box}|${s}`;
      out.set(key, [...(out.get(key) ?? []), down ? p[0] : p[1]]);
    }
  });
  return out;
}

const near = (taken: ReadonlyMap<string, readonly number[]>, key: string, at: number) =>
  (taken.get(key) ?? []).some((v) => Math.abs(v - at) < S.laneGap);
