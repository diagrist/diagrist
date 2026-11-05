import type { Side } from '../../geometry.js';
import type { Board, Box } from '../boxes.js';
import type { Plan } from '../grid.js';
import type { Port } from '../ports.js';
import { reservedOn } from '../reserve.js';
import { freeOf, intersect, nearest, type Range, sideOf, within } from './free.js';

const flat = (side: Side): boolean => side === 'top' || side === 'bottom';
const middle = ([a, b]: Range): number => (a + b) / 2;
/** How finely a train of ends slides along its side. */
const STEP = 2;

/** One end of a planned edge on a side of its box. */
interface End {
  readonly plan: Plan;
  readonly at: 'from' | 'to';
  readonly box: Box;
  readonly side: Side;
  /** Where the other box lies along this side, to order the ends. */
  readonly other: number;
}

const endsOf = (p: Plan): End[] => [
  { plan: p, at: 'from', box: p.a, side: p.fromSide, other: middle(sideOf(p.b, p.fromSide)) },
  { plan: p, at: 'to', box: p.b, side: p.toSide, other: middle(sideOf(p.a, p.toSide)) },
];

/**
 * The x a column of reserved sides keeps free for its vertical lines: right of the widest reserved stretch of its
 * boxes, so the lines of a column stand on one spine.
 */
function spineOf(board: Board, box: Box, gap: number): number | undefined {
  const reach = board.nodes
    .filter((n) => n.colIndex === box.colIndex)
    .flatMap((n) => [reservedOn(board.node(n.id), n.rect, 'top'), reservedOn(board.node(n.id), n.rect, 'bottom')])
    .flatMap((r) => (r ? [r[1] + gap] : []));
  return reach.length === 0 ? undefined : Math.max(...reach);
}

/**
 * Straight edges between the same two boxes run `spread` apart around the middle of what their sides share, each
 * in the free stretches of both sides; a column of reserved sides keeps its spine. An edge whose boxes share no free
 * stretch gets no place and bends instead.
 */
function straightPorts(board: Board, plans: readonly Plan[], spread: number, gap: number): Map<Plan, number> {
  const groups = new Map<string, Plan[]>();
  for (const p of plans.filter((q) => q.shape === 'straight')) {
    const k = `${[p.a.id, p.b.id].sort().join('|')}|${flat(p.fromSide)}`;
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const out = new Map<Plan, number>();
  for (const members of groups.values()) {
    const first = members[0] as Plan;
    const ranges = intersect(freeOf(board, first.a, first.fromSide, gap), freeOf(board, first.b, first.toSide, gap));
    if (ranges.length === 0) continue;
    const [a, b] = [sideOf(first.a, first.fromSide), sideOf(first.b, first.toSide)];
    const shared: Range = [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
    const centre = middle(a) === middle(b) ? middle(a) : middle(shared);
    const spine = flat(first.fromSide) ? spineOf(board, first.a, gap) : undefined;
    const c = within(centre, ranges) || spine === undefined || !within(spine, ranges) ? centre : spine;
    members.forEach((p, i) => {
      const at = nearest(c + (i - (members.length - 1) / 2) * spread, ranges);
      if (at !== undefined) out.set(p, at);
    });
  }
  return out;
}

/** Order of the ends on one side: by where their other box lies, nested Ls and parallel Zs between the same boxes. */
function byOther(e: End, f: End): number {
  if (e.other !== f.other) return e.other - f.other;
  const sign = (x: End) => (x.plan.shape === 'L' && x.other < middle(sideOf(x.box, x.side)) ? -1 : 1);
  return (e.plan.key - f.plan.key) * sign(e);
}

const pairOf = (e: End): string => [e.plan.a.id, e.plan.b.id].sort().join('|');

/**
 * A train parted around the one straight end of its side, the ends whose other box lies before it before it and the
 * rest after, `spread` from it and the steps of the train between each other; then the other partings, nearest
 * first. `undefined` when the side has not one straight end or no parting fits its free stretches.
 */
function around(
  ends: readonly End[],
  steps: readonly number[],
  fixed: readonly number[],
  free: readonly Range[],
  spread: number,
): number[] | undefined {
  const [f] = fixed;
  if (f === undefined || fixed.length !== 1) return undefined;
  const natural = ends.filter((e) => e.other < f).length;
  const partings = ends
    .map((_, k) => k)
    .concat(ends.length)
    .sort((a, b) => Math.abs(a - natural) - Math.abs(b - natural) || a - b);
  for (const k of partings) {
    const spots = ends.map(() => 0);
    for (let i = k - 1; i >= 0; i--) spots[i] = i === k - 1 ? f - spread : (spots[i + 1] ?? f) - (steps[i] ?? spread);
    for (let i = k; i < ends.length; i++)
      spots[i] = i === k ? f + spread : (spots[i - 1] ?? f) + (steps[i - 1] ?? spread);
    if (spots.every((v) => within(v, free))) return spots;
  }
  return undefined;
}

/**
 * Bent ends of one side, in the order of their other ends, as a train: `spread` apart, twice that between two ends
 * of edges between the same boxes, so their texts find room between them. The train stands inside the free stretches
 * of the side and `spread` clear of its straight ends, its middle as near the middle of the side as that allows, on a
 * tie towards where the other ends lie. Where no train fits beside a single straight end, it parts around it (`around`);
 * where that fails too, the ends spread evenly over the longest free stretch.
 */
function bentPorts(ends: readonly End[], fixed: readonly number[], free: readonly Range[], spread: number): number[] {
  const steps = ends.slice(1).map((e, i) => (pairOf(e) === pairOf(ends[i] as End) ? 2 * spread : spread));
  const offsets = [0];
  for (const d of steps) offsets.push((offsets.at(-1) ?? 0) + d);
  const total = offsets.at(-1) ?? 0;
  const [lo, hi] = [Math.min(...free.map((r) => r[0])), Math.max(...free.map((r) => r[1]))];
  const centre = (lo + hi) / 2;
  const towards = ends.reduce((sum, e) => sum + e.other, 0) / ends.length;
  const fits = (start: number) =>
    offsets.every((d) => within(start + d, free) && fixed.every((f) => Math.abs(f - start - d) >= spread - 0.5));
  const starts: number[] = [];
  for (let s = lo; s + total <= hi + 0.5; s += STEP) if (fits(s)) starts.push(s);
  const cost = (s: number) => Math.abs(s + total / 2 - centre) + Math.abs(s + total / 2 - towards) / 1000;
  const best = [...starts, ...(fits(centre - total / 2) ? [centre - total / 2] : [])].sort(
    (a, b) => cost(a) - cost(b),
  )[0];
  if (best !== undefined) return offsets.map((d) => best + d);
  const split = around(ends, steps, fixed, free, spread);
  if (split !== undefined) return split;
  const longest = [...free].sort((x, y) => y[1] - y[0] - (x[1] - x[0]))[0] ?? [lo, hi];
  return ends.map((_, i) => longest[0] + ((longest[1] - longest[0]) * (i + 1)) / (ends.length + 1));
}

/**
 * The ports of a channel grid, by plan: straight edges first, then the bent ends of every side around them. A
 * straight edge without a place shared by both sides is missing from the result and has to bend.
 */
export function channelPorts(board: Board, plans: readonly Plan[], spread: number, gap: number): Map<Plan, Port> {
  const straight = straightPorts(board, plans, 2 * spread, gap);
  const sides = new Map<string, End[]>();
  for (const e of plans.flatMap(endsOf)) {
    const k = `${e.box.id}|${e.side}`;
    sides.set(k, [...(sides.get(k) ?? []), e]);
  }
  const along = new Map<End, number>();
  for (const list of sides.values()) {
    const first = list[0] as End;
    const fixed = list.filter((e) => straight.has(e.plan));
    for (const e of fixed) along.set(e, straight.get(e.plan) as number);
    const bent = list.filter((e) => e.plan.shape !== 'straight').sort(byOther);
    if (bent.length === 0) continue;
    const free = freeOf(board, first.box, first.side, gap);
    const usable = free.length > 0 ? free : [sideOf(first.box, first.side)];
    const spots = bentPorts(
      bent,
      [...along.entries()].filter(([e]) => list.includes(e)).map(([, v]) => v),
      usable,
      spread,
    );
    for (const [i, e] of bent.entries()) along.set(e, spots[i] as number);
  }
  const out = new Map<Plan, Port>();
  for (const [e, v] of along) {
    const port = out.get(e.plan) ?? { from: v, to: v };
    out.set(e.plan, e.at === 'from' ? { ...port, from: v } : { ...port, to: v });
  }
  return out;
}
