import type { Point, Rect } from '@diagrist/core';
import type { PlacedGroup, Route } from '../layout.js';
import { holders } from './rail-frames.js';
import type { RailSide } from './rail-order.js';
import { stretch, texts } from './rail-room.js';
import type { LayeredEdge, LayeredMetrics, LayeredSpec } from './spec.js';

/** What the rails of a picture are drawn from: their edges and sides, the boxes and frames, the layers. */
export interface RailInput {
  readonly edges: readonly LayeredEdge[];
  readonly sides: ReadonlyMap<string, readonly RailSide[]>;
  /** Every box and placeholder as it stands. */
  readonly boxes: ReadonlyMap<string, Rect>;
  /** Every box and placeholder, those with loops as wide as their loops. */
  readonly rects: ReadonlyMap<string, Rect>;
  readonly layerOf: ReadonlyMap<string, number>;
  readonly frames: readonly PlacedGroup[];
  /** The other lines: a rail passes beyond the text each may carry beside its longest upright piece. */
  readonly lines: readonly Route[];
}

/** One rail as placed: its ends by layer, its side, its track and its text's room. */
interface Laid {
  readonly edge: LayeredEdge;
  readonly upper: string;
  readonly lower: string;
  readonly side: RailSide;
  readonly at: number;
  readonly room: number;
  /** The stretch its track and text take: from the middle of one end to the middle of the other, and its text. */
  readonly lo: number;
  readonly hi: number;
}

const right = (r: Rect) => r.x + r.w;

/** What a crossing with a rail placed before costs the side of a rail, in pixels of length. */
const CROSSING = 10_000;
const label = (e: LayeredEdge) => e.label?.width ?? 0;

/**
 * Places the rails, shortest first: each runs `lead` beyond every box, placeholder and foreign frame beside the
 * stretch between its ends, outside the rails placed before it on that side whose stretch (`stretch`) meets its own
 * by their room, the text of the inner one standing between them; rails one above the other share a track. Of the sides it may take, the one where it crosses fewer rails placed before it, those it
 * does not hold inside its stretch, and then where its pieces out of the ends are shorter wins, the left one on a tie.
 */
function place(
  input: RailInput,
  m: LayeredMetrics,
  held: ReadonlyMap<string, ReadonlySet<string>>,
  spec: LayeredSpec,
): Laid[] {
  const layer = (n: string) => input.layerOf.get(n) ?? 0;
  const span = (e: LayeredEdge) => Math.abs(layer(e.from) - layer(e.to));
  const order = [...input.edges].sort((a, b) => span(a) - span(b));
  const laid: Laid[] = [];
  for (const e of order) {
    const [up, low] = layer(e.from) < layer(e.to) ? [e.from, e.to] : [e.to, e.from];
    const [upper, lower] = [input.boxes.get(up), input.boxes.get(low)];
    if (upper === undefined || lower === undefined) continue;
    const looped = (n: string, side: RailSide) => {
      const [r, w] = [input.boxes.get(n), input.rects.get(n)];
      return r !== undefined && w !== undefined && (side === 'left' ? w.x < r.x : right(w) > right(r));
    };
    const [top, bottom] = [upper.y, lower.y + lower.h];
    const { lo, hi } = stretch(e, upper, lower);
    const both = (f: string) => held.get(e.from)?.has(f) === true && held.get(e.to)?.has(f) === true;
    const reach = (side: RailSide) => texts(input.lines, side, top, bottom, m, spec);
    const beside = [
      ...[...input.rects].filter(([n]) => layer(n) >= layer(up) && layer(n) <= layer(low)).map(([, r]) => r),
      ...input.frames.filter((f) => !both(f.id) && f.rect.y < bottom && f.rect.y + f.rect.h > top).map((f) => f.rect),
    ];
    const allowed = input.sides.get(e.id) ?? ['left'];
    const unlooped = allowed.filter((side) => !looped(up, side) && !looped(low, side));
    const free = unlooped.length > 0 ? unlooped : allowed;
    const tried = free.map((side) => {
      const own =
        side === 'left'
          ? Math.min(...beside.map((r) => r.x), ...reach(side)) - m.lead
          : Math.max(...beside.map(right), ...reach(side)) + m.lead;
      const inner = laid.filter((p) => p.side === side && p.lo < hi && p.hi > lo);
      const outer = inner.map((p) => (side === 'left' ? p.at - p.room : p.at + p.room));
      const crossed = inner.filter((p) => p.lo > lo || p.hi < hi).length;
      const at = side === 'left' ? Math.min(own, ...outer) : Math.max(own, ...outer);
      const edge = (r: Rect) => (side === 'left' ? r.x : right(r));
      return { side, at, cost: CROSSING * crossed + Math.abs(at - edge(upper)) + Math.abs(at - edge(lower)) };
    });
    const best = tried.reduce<(typeof tried)[number] | undefined>((a, b) => (a && a.cost <= b.cost ? a : b), undefined);
    if (best === undefined) continue;
    const room = label(e) > 0 ? label(e) + 2 * m.labelGap + m.track / 2 : m.track;
    laid.push({ edge: e, upper: up, lower: low, side: best.side, at: best.at, room, lo, hi });
  }
  return laid;
}

/**
 * The ends of the rails on each side of a box, top first: those leaving it upward, inner rails first, then those
 * arriving from below, outer rails first, so no piece out of the box crosses a rail of another; `portGap` apart, or
 * closer where the side is short, around its middle.
 */
function docks(laid: readonly Laid[], rects: ReadonlyMap<string, Rect>, m: LayeredMetrics): Map<string, number> {
  const ends = new Map<string, { key: string; up: boolean; reach: number }[]>();
  for (const l of laid)
    for (const [n, up] of [
      [l.lower, true],
      [l.upper, false],
    ] as const) {
      const r = rects.get(n);
      if (r === undefined) continue;
      const reach = Math.abs(l.at - (l.side === 'left' ? r.x : right(r)));
      const at = `${n}|${l.side}`;
      ends.set(at, [...(ends.get(at) ?? []), { key: `${l.edge.id}|${up ? 'lower' : 'upper'}`, up, reach }]);
    }
  const out = new Map<string, number>();
  for (const [at, list] of ends) {
    const r = rects.get(at.split('|')[0] ?? '') as Rect;
    const ordered = [
      ...list.filter((x) => x.up).sort((a, b) => a.reach - b.reach),
      ...list.filter((x) => !x.up).sort((a, b) => b.reach - a.reach),
    ];
    const step = ordered.length > 1 ? Math.min(m.portGap, (r.h - 8) / (ordered.length - 1)) : 0;
    ordered.forEach((x, i) => {
      out.set(x.key, r.y + r.h / 2 + (i - (ordered.length - 1) / 2) * step);
    });
  }
  return out;
}

/** The rails of a picture laid out: their routes by edge, and the room each frame holding both ends of one needs. */
export interface Railed {
  readonly routes: ReadonlyMap<string, Route>;
  /** How far left and right of its boxes each frame must reach for the rails and texts inside it. */
  readonly reach: ReadonlyMap<string, { readonly left: number; readonly right: number }>;
}

/**
 * Draws the rails (layout plan P8, `LayeredEdge.rail`): out of a side of one end, along the track beside the layers
 * between, into the same side of the other end. A frame holding both ends holds the rail and its text.
 */
export function drawRails(input: RailInput, m: LayeredMetrics, spec: LayeredSpec): Railed {
  const held = holders(spec);
  const laid = place(input, m, held, spec);
  const y = docks(laid, input.boxes, m);
  const routes = new Map<string, Route>();
  const reach = new Map<string, { left: number; right: number }>();
  for (const l of laid) {
    const [lower, upper] = [input.boxes.get(l.lower) as Rect, input.boxes.get(l.upper) as Rect];
    const x = (r: Rect) => (l.side === 'left' ? r.x : right(r));
    const [y1, y2] = [y.get(`${l.edge.id}|lower`) ?? 0, y.get(`${l.edge.id}|upper`) ?? 0];
    const rising: Point[] = [
      [x(lower), y1],
      [l.at, y1],
      [l.at, y2],
      [x(upper), y2],
    ];
    const points = l.edge.from === l.lower ? rising : rising.reverse();
    routes.set(l.edge.id, { edge: l.edge.id, points, shape: 'orthogonal', fromSide: l.side, toSide: l.side });
    const outer = label(l.edge) > 0 ? label(l.edge) + 2 * m.labelGap : 0;
    for (const f of held.get(l.lower) ?? []) {
      if (held.get(l.upper)?.has(f) !== true) continue;
      const was = reach.get(f) ?? { left: Number.POSITIVE_INFINITY, right: Number.NEGATIVE_INFINITY };
      reach.set(
        f,
        l.side === 'left'
          ? { ...was, left: Math.min(was.left, l.at - outer) }
          : { ...was, right: Math.max(was.right, l.at + outer) },
      );
    }
  }
  return { routes, reach };
}
