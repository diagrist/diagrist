import { type Point, type Rect, segmentMeetsRect } from '@diagrist/core';
import type { PlacedGroup } from '../layout.js';
import type { GraphEdge, LayoutGraph } from './spec.js';
import { CLEAR, costOf, endsOf, type Moved, movedCost } from './straight-cost.js';

/** The least room between two boxes of one layer once one moved. */
const ROOM = 16;
/** Steps a box tries along its layer, in pixels. */
const STEPS = [8, 16, 24, 32, 48, 64, 80, 96, 128].flatMap((s) => [s, -s]);
/** Steps a box tries across its layer, into the gaps beside it, in pixels. */
const ASIDE = [16, 32, 48, 64, 96].flatMap((s) => [s, -s]);
/** Rounds of moves; each moves one box. */
const ROUNDS = 8;

/** The frames holding a node and those that do not hold it. Shared with `packFrames`. */
export function framing(
  graph: LayoutGraph,
  frames: readonly PlacedGroup[],
): (n: string) => { own: PlacedGroup[]; foreign: PlacedGroup[] } {
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
  const foreignOf = new Map<GraphEdge, Rect[]>();
  /** The frames a line passes that hold neither of its ends, the same for every move and kept per edge. */
  const passed = (e: GraphEdge) => {
    const known = foreignOf.get(e);
    if (known !== undefined) return known;
    const held = new Set([...frameOf(e.from).own, ...frameOf(e.to).own].map((f) => f.id));
    const out = frames.filter((f) => !held.has(f.id)).map((f) => f.rect);
    foreignOf.set(e, out);
    return out;
  };
  let cost = costOf(straight, nodes, best, heads, passed);
  for (let round = 0; round < ROUNDS && cost > 0; round++) {
    const priced = movedCost(straight, nodes, best, heads, passed);
    const now = new Map(straight.map((e) => [e, endsOf(e, nodes, best)] as const));
    const movers = new Set<string>();
    for (const e of straight) {
      const ends = now.get(e);
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
          const ends = id === e.from || id === e.to ? undefined : now.get(e);
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
        const c = priced(cost, id, moved);
        if (c < (next?.cost ?? cost)) next = { rects: new Map(best).set(id, moved), cost: c };
      }
    }
    if (next === undefined) break;
    best = next.rects;
    cost = next.cost;
  }
  return best;
}
