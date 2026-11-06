import { list } from '@diagrist/lang';
import { ACTIVITIES } from '../../spec/activities.js';
import { implementing } from '../../spec/catalog.js';
import type { ActivityModel } from '../model/index.js';
import { at, defineRule } from './shared.js';

/** Up to this many lanes every order is tried; 7 lanes are 5,040 orders. Beyond it the rule says nothing. */
const MOST_LANES = 7;

/** A stretch of the flow order, from the earlier end to the later one. */
type Stretch = readonly [number, number];

const overlap = (a: Stretch, b: Stretch): boolean => Math.max(a[0], b[0]) < Math.min(a[1], b[1]);

/**
 * Where each node stands in the order of the flows, without laying anything out: the longest way to it from a node
 * without incoming flow, flows that close a cycle left out. Lines between two nodes run where their stretches meet.
 * The flows that close a cycle come back too, by their index: the engine draws them as rails beside the picture.
 */
function depths(m: ActivityModel): { readonly depth: ReadonlyMap<string, number>; readonly back: ReadonlySet<number> } {
  const state = new Map<string, 'open' | 'done'>();
  const back = new Set<number>();
  const visit = (id: string): void => {
    state.set(id, 'open');
    for (const f of m.outs(id)) {
      const seen = state.get(f.to);
      if (seen === 'open') back.add(m.flows.indexOf(f));
      else if (seen === undefined) visit(f.to);
    }
    state.set(id, 'done');
  };
  for (const n of m.nodes) if (!state.has(n.id)) visit(n.id);
  const depth = new Map<string, number>();
  const of = (id: string): number => {
    const known = depth.get(id);
    if (known !== undefined) return known;
    depth.set(id, 0);
    const before = m.ins(id).filter((f) => !back.has(m.flows.indexOf(f)) && f.from !== id);
    const d = Math.max(0, ...before.map((f) => of(f.from) + 1));
    depth.set(id, d);
    return d;
  };
  for (const n of m.nodes) of(n.id);
  return { depth, back };
}

/** A flow between two lanes: the lanes by their index as written, and its stretch of the flow order. */
interface Crossing {
  readonly from: number;
  readonly to: number;
  readonly stretch: Stretch;
  /** Per lane, how many flows inside it overlap this flow's stretch, so the flow crosses them passing over it. */
  readonly walls: readonly number[];
}

/** Every order of `0 … n-1`, in lexicographic order, so the order as written comes first. */
function* orders(n: number, prefix: readonly number[] = []): Generator<readonly number[]> {
  if (prefix.length === n) yield prefix;
  for (let i = 0; i < n; i++) if (!prefix.includes(i)) yield* orders(n, [...prefix, i]);
}

/** The flows between lanes and the pairs of them that meet in the flow order, read once for all orders. */
function crossingsOf(m: ActivityModel, lanes: readonly string[]): { all: Crossing[]; pairs: [Crossing, Crossing][] } {
  const { depth, back } = depths(m);
  const laneOf = (id: string) => lanes.indexOf(m.byId.get(id)?.lane ?? '');
  const flows = m.flows.flatMap((f, i) => {
    const [a, b] = [laneOf(f.from), laneOf(f.to)];
    const [p, q] = [depth.get(f.from) ?? 0, depth.get(f.to) ?? 0];
    return a < 0 || b < 0 || p === q || back.has(i)
      ? []
      : [{ from: a, to: b, stretch: [Math.min(p, q), Math.max(p, q)] as const }];
  });
  const inside = flows.filter((f) => f.from === f.to);
  const all = flows
    .filter((f) => f.from !== f.to)
    .map((f) => ({
      ...f,
      walls: lanes.map((_, k) => inside.filter((w) => w.from === k && overlap(w.stretch, f.stretch)).length),
    }));
  const pairs = all.flatMap((f, i) =>
    all.slice(i + 1).flatMap((g): [Crossing, Crossing][] => (overlap(f.stretch, g.stretch) ? [[f, g]] : [])),
  );
  return { all, pairs };
}

/** How many crossings the lanes at the places `place` (by lane index) force. */
function cost(place: readonly number[], all: readonly Crossing[], pairs: readonly [Crossing, Crossing][]): number {
  const span = (c: Crossing): Stretch => {
    const [a, b] = [place[c.from] ?? 0, place[c.to] ?? 0];
    return [Math.min(a, b), Math.max(a, b)];
  };
  const between = (x: number, s: Stretch) => s[0] < x && x < s[1];
  let n = 0;
  for (const c of all) {
    const s = span(c);
    c.walls.forEach((w, k) => {
      if (between(place[k] ?? 0, s)) n += w;
    });
  }
  for (const [f, g] of pairs) {
    const [s, t] = [span(f), span(g)];
    if ((between(t[0], s) && t[1] > s[1]) || (between(s[0], t) && s[1] > t[1])) n++;
  }
  return n;
}

export const laneOrder = implementing(
  { uml: [ACTIVITIES.partition] },
  defineRule(
    'U958',
    'warning',
    'A flow between two lanes passes over the lanes between them and crosses their own flows. When another order of the partitions crosses fewer, counted on the order of the flows without a layout, the warning names it. The lanes keep the order they are written in.',
    (m) => {
      const lanes = m.diagram.partitions.map((p) => p.id);
      const first = m.diagram.partitions[0];
      if (lanes.length < 3 || lanes.length > MOST_LANES || first === undefined) return [];
      const { all, pairs } = crossingsOf(m, lanes);
      const written = cost(
        lanes.map((_, i) => i),
        all,
        pairs,
      );
      let best: { order: readonly number[]; cost: number } | undefined;
      for (const order of orders(lanes.length)) {
        const place = lanes.map((_, k) => order.indexOf(k));
        const n = cost(place, all, pairs);
        if (n < (best?.cost ?? written)) best = { order, cost: n };
      }
      if (best === undefined) return [];
      const named = list(best.order.map((k) => lanes[k] ?? ''));
      return [at(first.span, { count: String(written), order: named, best: String(best.cost) })];
    },
  ),
);
