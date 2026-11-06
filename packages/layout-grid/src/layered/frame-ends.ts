import type { Point, Rect } from '@diagrist/core';
import type { Route } from '../layout.js';
import type { LayeredLayout } from './output.js';
import type { LayeredFrame, LayeredSpec } from './spec.js';

/** An edge with a frame at an end, laid out to a box of that frame: the frame of each such end. */
type FrameEnds = ReadonlyMap<string, { readonly from?: string; readonly to?: string }>;

/** A picture whose edges with a frame at an end run to a box of the frame, and which ends those were. */
export interface Anchored {
  readonly spec: LayeredSpec;
  readonly ends: FrameEnds;
}

/** The boxes in every frame, directly or in the frames inside it, in the order of the nodes. */
function boxesIn(spec: LayeredSpec): Map<string, string[]> {
  const frames = spec.frames ?? [];
  const parent = new Map(frames.map((f) => [f.id, f.parent]));
  const home = new Map(frames.flatMap((f) => f.members.map((n) => [n, f.id] as const)));
  const out = new Map<string, string[]>(frames.map((f) => [f.id, []]));
  for (const { id } of spec.nodes)
    for (let f = home.get(id), seen = 0; f !== undefined && seen < frames.length; f = parent.get(f), seen++)
      out.get(f)?.push(id);
  return out;
}

/**
 * Edges with a frame at an end run to a box of that frame, which takes the end like any other in the order, the
 * ports and the tracks, and `released` then ends the line on the frame's outline. The box stands in the frame's
 * first layer when the other end stands above the frame, in its last when it stands below, else in the first layer
 * both share; of those, the box with the most edges to the other end, the first one on a tie.
 */
export function anchorFrameEnds(spec: LayeredSpec, layers: readonly (readonly string[])[]): Anchored {
  const boxes = new Set(spec.nodes.map((n) => n.id));
  const ends = new Map<string, { from?: string; to?: string }>();
  if (spec.edges.every((e) => boxes.has(e.from) && boxes.has(e.to))) return { spec, ends };
  const inside = boxesIn(spec);
  const layerOf = new Map(layers.flatMap((layer, l) => layer.map((n) => [n, l] as const)));
  const own = (id: string) => (boxes.has(id) ? [id] : (inside.get(id) ?? []));
  const range = (id: string): [number, number] | undefined => {
    const ls = own(id).flatMap((n) => layerOf.get(n) ?? []);
    return ls.length === 0 ? undefined : [Math.min(...ls), Math.max(...ls)];
  };
  const links = (n: string, other: readonly string[]) =>
    spec.edges.filter((e) => (e.from === n && other.includes(e.to)) || (e.to === n && other.includes(e.from))).length;
  const edges = spec.edges.flatMap((e) => {
    if (boxes.has(e.from) && boxes.has(e.to)) return [e];
    const [a, b] = [range(e.from), range(e.to)];
    if (a === undefined || b === undefined) return [];
    const box = (frame: string, mine: [number, number], other: [number, number], far: string) => {
      const l = other[1] < mine[0] ? mine[0] : other[0] > mine[1] ? mine[1] : Math.max(mine[0], other[0]);
      const there = own(frame).filter((n) => layerOf.get(n) === l);
      const counted = own(far);
      return there.reduce((x, y) => (links(y, counted) > links(x, counted) ? y : x), there[0] as string);
    };
    const from = boxes.has(e.from) ? e.from : box(e.from, a, b, e.to);
    const to = boxes.has(e.to) ? e.to : box(e.to, b, a, e.from);
    const framed = { ...(from === e.from ? {} : { from: e.from }), ...(to === e.to ? {} : { to: e.to }) };
    ends.set(e.id, framed);
    return from === to ? [] : [{ ...e, from, to, framed }];
  });
  return { spec: { ...spec, edges }, ends };
}

/**
 * A route that runs into a box of `r`, cut where its end piece meets the outline of `r`, whose top lies `top` lower.
 * A route whose end piece stays inside `r` keeps its end.
 */
function cut(route: Route, at: 'from' | 'to', r: Rect, top: number): Route {
  const points = at === 'from' ? [...route.points] : [...route.points].reverse();
  const [inner, outer] = [points[0] as Point, points[1] ?? (points[0] as Point)];
  const [y0, y1, x0, x1] = [r.y + top, r.y + r.h, r.x, r.x + r.w];
  const between = (v: number, p: number, q: number) => v >= Math.min(p, q) && v <= Math.max(p, q);
  const vertical = inner[0] === outer[0];
  const v = vertical ? (outer[1] < inner[1] ? y0 : y1) : outer[0] < inner[0] ? x0 : x1;
  if (!between(v, inner[vertical ? 1 : 0], outer[vertical ? 1 : 0])) return route;
  points[0] = vertical ? [inner[0], v] : [v, inner[1]];
  return { ...route, points: at === 'from' ? points : points.reverse() };
}

/**
 * The layout of an anchored picture as the kind asked for it: every line that ran to a box for a frame cut at the
 * outline of the frame, below the head where the frame wears it as a tab, and a text seated inside that frame moved
 * along with the end.
 */
export function released(spec: LayeredSpec, layout: LayeredLayout, ends: FrameEnds): LayeredLayout {
  if (ends.size === 0) return layout;
  const rects = new Map((layout.frames ?? []).map((f) => [f.id, f.rect]));
  const byId = new Map<string, LayeredFrame>((spec.frames ?? []).map((f) => [f.id, f]));
  const shifts = new Map<number, (readonly [Rect, number, number])[]>();
  const routes = layout.routes.map((route, i) => {
    let out = route;
    for (const end of ['from', 'to'] as const) {
      const frame = ends.get(route.edge)?.[end];
      const r = frame === undefined ? undefined : rects.get(frame);
      if (frame === undefined || r === undefined) continue;
      const f = byId.get(frame);
      const before = (end === 'from' ? out.points[0] : out.points.at(-1)) as Point;
      out = cut(out, end, r, f?.tab === true ? f.head.height : 0);
      const after = (end === 'from' ? out.points[0] : out.points.at(-1)) as Point;
      shifts.set(i, [...(shifts.get(i) ?? []), [r, after[0] - before[0], after[1] - before[1]] as const]);
    }
    return out;
  });
  const within = (b: Rect, r: Rect) => {
    const [x, y] = [b.x + b.w / 2, b.y + b.h / 2];
    return x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;
  };
  const labels = layout.labels.map((l) => {
    const [, dx, dy] = shifts.get(l.route)?.find(([r]) => within(l.box, r)) ?? [undefined, 0, 0];
    if (dx === 0 && dy === 0) return l;
    return { ...l, x: l.x + dx, y: l.y + dy, box: { ...l.box, x: l.box.x + dx, y: l.box.y + dy } };
  });
  const boxes = new Map(labels.map((l, i) => [layout.labels[i]?.box, l.box]));
  return { ...layout, labels, placed: layout.placed.map((p) => ({ ...p, rect: boxes.get(p.rect) ?? p.rect })), routes };
}
