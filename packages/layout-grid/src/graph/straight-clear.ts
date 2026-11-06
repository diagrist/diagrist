import { type Point, type Rect, segmentMeetsRect, segmentsIntersect } from '@diagrist/core';
import type { PlacedGroup } from '../layout.js';
import type { GraphEdge, GraphNode, LayoutGraph } from './spec.js';
import { straightRoute } from './straight-route.js';

/** A line keeps this far from a box it does not join, as the line check asks. */
const CLEAR = 6;
/** The least room between two boxes of one layer once one moved. */
const ROOM = 16;
/** Steps a box tries along its layer, in pixels. */
const STEPS = [8, 16, 24, 32, 48, 64, 80, 96, 128].flatMap((s) => [s, -s]);
/** Steps a box tries across its layer, into the gaps beside it, in pixels. */
const ASIDE = [16, 32, 48, 64, 96].flatMap((s) => [s, -s]);
/** Rounds of moves; each moves one box. */
const ROUNDS = 8;
/** A line through a box weighs as ten crossings, as in `scoreOf`. */
const THROUGH = 10;

type Moved = Map<string, Rect>;

/** The frames holding a node, innermost first, and every frame by id. */
function framing(graph: LayoutGraph, frames: readonly PlacedGroup[]) {
  const containers = graph.containers ?? [];
  const holds = (id: string, n: string): boolean => {
    const c = containers.find((k) => k.id === id);
    return c !== undefined && (c.members.includes(n) || containers.some((k) => k.parent === id && holds(k.id, n)));
  };
  return (n: string) => ({
    own: frames.filter((f) => holds(f.id, n)),
    foreign: frames.filter((f) => !holds(f.id, n)),
  });
}

/** The ends of the straight line of `e` between the boxes `rects` holds. */
function endsOf(e: GraphEdge, nodes: ReadonlyMap<string, GraphNode>, rects: Moved): [Point, Point] | undefined {
  const [a, b] = [rects.get(e.from), rects.get(e.to)];
  if (a === undefined || b === undefined) return undefined;
  const r = straightRoute(e.id, { rect: a, node: nodes.get(e.from) }, { rect: b, node: nodes.get(e.to) });
  return [r.points[0] ?? [0, 0], r.points[1] ?? [0, 0]];
}

/**
 * Lines through boxes they do not join or through the heads of frames, ten each, crossings of lines that share no
 * end, and lines through frames that hold neither of their ends or closer past them than `CLEAR`, as the line check
 * keeps lines from boxes.
 */
function costOf(
  edges: readonly GraphEdge[],
  nodes: ReadonlyMap<string, GraphNode>,
  rects: Moved,
  heads: readonly Rect[],
  foreign: (e: GraphEdge) => readonly Rect[],
): number {
  const lines = edges.flatMap((e) => {
    const ends = endsOf(e, nodes, rects);
    return ends === undefined ? [] : [{ e, p: ends[0], q: ends[1] }];
  });
  let cost = 0;
  for (const l of lines)
    for (const [id, r] of rects)
      if (id !== l.e.from && id !== l.e.to && segmentMeetsRect(l.p, l.q, r, CLEAR)) cost += THROUGH;
  for (const l of lines) cost += THROUGH * heads.filter((h) => segmentMeetsRect(l.p, l.q, h, CLEAR)).length;
  for (const l of lines) cost += foreign(l.e).filter((f) => segmentMeetsRect(l.p, l.q, f, CLEAR)).length;
  lines.forEach((l, i) => {
    for (const k of lines.slice(i + 1)) {
      const shared = [l.e.from, l.e.to].some((n) => n === k.e.from || n === k.e.to);
      if (!shared && segmentsIntersect(l.p, l.q, k.p, k.q)) cost++;
    }
  });
  return cost;
}

/**
 * The moves along `axis` that take `r` off the line from `p` to `q`, each way: first by `ROOM`, then by the least the
 * line check asks, more than `CLEAR`, in whole pixels and as far as the steps go; none where the line misses it.
 */
function clearing([p, q]: [Point, Point], r: Rect, axis: 'x' | 'y'): number[] {
  if (!segmentMeetsRect(p, q, r, CLEAR)) return [];
  const [u, v] = axis === 'y' ? ([0, 1] as const) : ([1, 0] as const);
  const [a, b] = [p[u], q[u]];
  const at = (w: number) => (a === b ? [p[v], q[v]] : [p[v] + ((q[v] - p[v]) * (w - a)) / (b - a)]);
  const [lo, size] = axis === 'y' ? [r.x, r.w] : [r.y, r.h];
  const seen = [...at(Math.max(lo - CLEAR, Math.min(a, b))), ...at(Math.min(lo + size + CLEAR, Math.max(a, b)))];
  const [start, length] = axis === 'y' ? [r.y, r.h] : [r.x, r.w];
  const limit = Math.max(...STEPS);
  return [ROOM, CLEAR + 1]
    .flatMap((gap) => [
      Math.ceil(Math.max(...seen) + gap - start),
      Math.floor(Math.min(...seen) - gap - start - length),
    ])
    .filter((d) => Math.abs(d) <= limit);
}

const apart = (a: Rect, b: Rect, gap: number) =>
  a.x + a.w + gap <= b.x || b.x + b.w + gap <= a.x || a.y + a.h + gap <= b.y || b.y + b.h + gap <= a.y;
const inside = (r: Rect, f: Rect, pad: number, top: number) =>
  r.x >= f.x + pad && r.y >= f.y + top && r.x + r.w <= f.x + f.w - pad && r.y + r.h <= f.y + f.h - pad;

/**
 * Boxes moved where a straight line runs through a box it does not join, through the head of a frame or through or
 * close past a frame holding neither of its ends: of the moves of a box a line passes or of an
 * end of such a line, along its layer by up to 128 pixels, just off a line that runs through it, or into the gaps
 * beside it by up to 96, that keep it `ROOM`
 * from every other box, inside the picture as it stands, inside its frames by their pads and their top and outside the
 * others, the one that costs least by lines through boxes
 * and crossings stays while it costs less, in rounds. The layered stages place boxes for lines between layers, which a
 * straight line leaves where it cuts across a layer.
 */
export function clearStraight(
  graph: LayoutGraph,
  straight: readonly GraphEdge[],
  rects: ReadonlyMap<string, Rect>,
  frames: readonly PlacedGroup[],
): Moved {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const across = graph.given?.direction === 'right' ? 'y' : 'x';
  const frameOf = framing(graph, frames);
  const pads = new Map((graph.containers ?? []).map((c) => [c.id, c]));
  const all = [...rects.values(), ...frames.map((f) => f.rect)];
  const x = Math.min(...all.map((r) => r.x));
  const y = Math.min(...all.map((r) => r.y));
  const hull = { x, y, w: Math.max(...all.map((r) => r.x + r.w)) - x, h: Math.max(...all.map((r) => r.y + r.h)) - y };
  let best = new Map(rects);
  const heads = frames.flatMap((f) => {
    const head = pads.get(f.id)?.head;
    return head ? [{ x: f.rect.x, y: f.rect.y, w: head.width, h: head.height }] : [];
  });
  const passed = (e: GraphEdge) => {
    const held = new Set([...frameOf(e.from).own, ...frameOf(e.to).own].map((f) => f.id));
    return frames.filter((f) => !held.has(f.id)).map((f) => f.rect);
  };
  let cost = costOf(straight, nodes, best, heads, passed);
  for (let round = 0; round < ROUNDS && cost > 0; round++) {
    const movers = new Set<string>();
    for (const e of straight) {
      const ends = endsOf(e, nodes, best);
      if (ends === undefined) continue;
      const [p, q] = ends;
      for (const [id, r] of best)
        if (id !== e.from && id !== e.to && segmentMeetsRect(p, q, r, CLEAR))
          for (const n of [id, e.from, e.to]) movers.add(n);
      if ([...heads, ...passed(e)].some((h) => segmentMeetsRect(p, q, h, CLEAR)))
        for (const n of [e.from, e.to]) movers.add(n);
    }
    let next: { rects: Moved; cost: number } | undefined;
    for (const id of movers) {
      const r = best.get(id);
      if (r === undefined) continue;
      const { own, foreign } = frameOf(id);
      const shifts = [
        ...STEPS.map((d) => (across === 'y' ? [0, d] : [d, 0])),
        ...ASIDE.map((d) => (across === 'y' ? [d, 0] : [0, d])),
        ...straight.flatMap((e) => {
          const ends = id === e.from || id === e.to ? undefined : endsOf(e, nodes, best);
          return ends ? clearing(ends, r, across).map((d) => (across === 'y' ? [0, d] : [d, 0])) : [];
        }),
      ];
      for (const [dx, dy] of shifts) {
        const moved = { ...r, x: r.x + (dx ?? 0), y: r.y + (dy ?? 0) };
        const fits =
          inside(moved, hull, 0, 0) &&
          [...best].every(([o, q]) => o === id || apart(moved, q, ROOM)) &&
          own.every((f) => inside(moved, f.rect, pads.get(f.id)?.pad ?? 0, pads.get(f.id)?.top ?? 0)) &&
          foreign.every((f) => apart(moved, f.rect, 0));
        if (!fits) continue;
        const trial = new Map(best).set(id, moved);
        const c = costOf(straight, nodes, trial, heads, passed);
        if (c < (next?.cost ?? cost)) next = { rects: trial, cost: c };
      }
    }
    if (next === undefined) break;
    best = next.rects;
    cost = next.cost;
  }
  return best;
}
