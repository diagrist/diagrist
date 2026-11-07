import type { Point, Rect } from '@diagrist/core';
import type { PlacedGroup, Route } from '../layout.js';
import { railDocks } from './rail-docks.js';
import { besideRects, holders, railReach } from './rail-frames.js';
import { type LaneOf, laneTrack, railCrossings, railLane } from './rail-lanes.js';
import type { RailSide } from './rail-order.js';
import { ahead, stretch, texts } from './rail-room.js';
import { besideText, nextTextAt, pieceText, type RailPieces, type RailTextAt } from './rail-texts.js';
import type { LayeredEdge, LayeredMetrics, LayeredSpec } from './spec.js';

/** What the rails of a picture are drawn from: their edges and sides, the boxes and frames, the layers. */
export interface RailInput {
  readonly edges: readonly LayeredEdge[];
  readonly sides: ReadonlyMap<string, readonly RailSide[]>;
  /** Every box and placeholder as it stands. */
  readonly boxes: ReadonlyMap<string, Rect>;
  /** Every box and placeholder, those with loops as wide as their loops and those with `reach` as far as it goes. */
  readonly rects: ReadonlyMap<string, Rect>;
  /** Every box and placeholder, those with loops as wide as their loops: what the text of a rail stands clear of. */
  readonly drawn: ReadonlyMap<string, Rect>;
  readonly layerOf: ReadonlyMap<string, number>;
  readonly frames: readonly PlacedGroup[];
  /** The other lines. */
  readonly lines: readonly Route[];
  /** The texts of the other lines at their seats: a rail passes beyond those beside its stretch. */
  readonly seats: readonly Rect[];
  /** The lane of every node and placeholder, in a picture with lanes: a rail runs beside its own lane. */
  readonly lane?: LaneOf;
  /** The sides of boxes a line other than a rail takes already, as `box|side`: a rail takes another where it may. */
  readonly taken?: ReadonlySet<string>;
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
 * Places the rails, shortest first: each runs `lead` beyond every box, placeholder, foreign frame and text of another
 * line where the spot search puts it (`RailInput.seats`) beside the stretch between its ends, a box or frame its line is cut at counting as much wider (`besideRects`), outside the
 * rails placed before it on that side whose stretch (`stretch`) meets its own by their room, the text of the inner one
 * standing between them; rails one above the other share a track. Of the sides it may take, the one where it crosses
 * fewer rails, those placed before it that it does not hold inside its stretch and those still to come whose side is
 * settled and that do not hold it (`ahead`), and then where its pieces out of the ends are shorter wins, the left one
 * on a tie.
 */
function place(
  input: RailInput,
  m: LayeredMetrics,
  held: ReadonlyMap<string, ReadonlySet<string>>,
  where: ReadonlyMap<string, RailTextAt>,
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
    const { lo, hi } = stretch(e, upper, lower, where.get(e.id) ?? 'beside');
    const both = (f: string) => held.get(e.from)?.has(f) === true && held.get(e.to)?.has(f) === true;
    const reach = (side: RailSide) => texts(input.seats, side, top, bottom);
    const passed = [...input.rects].filter(([n]) => layer(n) >= layer(up) && layer(n) <= layer(low));
    const frames = input.frames.filter((f) => !both(f.id) && f.rect.y < bottom && f.rect.y + f.rect.h > top);
    const beside = besideRects(e, [...passed, ...frames.map((f) => [f.id, f.rect] as const)], m);
    const coming = ahead(order.slice(order.indexOf(e) + 1), input, layer, (o) => where.get(o.id) ?? 'beside');
    const allowed = input.sides.get(e.id) ?? ['left'];
    const unlooped = allowed.filter((side) => !looped(up, side) && !looped(low, side));
    const untaken = unlooped.filter((s) => !input.taken?.has(`${up}|${s}`) && !input.taken?.has(`${low}|${s}`));
    const free = untaken.length > 0 ? untaken : unlooped.length > 0 ? unlooped : allowed;
    const tried = free.map((side) => {
      const own =
        input.lane !== undefined
          ? laneTrack(side, passed, input.lane, railLane(e, side, input.lane), m.lead)
          : side === 'left'
            ? Math.min(...beside.map((r) => r.x), ...reach(side)) - m.lead
            : Math.max(...beside.map(right), ...reach(side)) + m.lead;
      const inner = laid.filter((p) => p.side === side && p.lo < hi && p.hi > lo);
      const outer = inner.map((p) => (side === 'left' ? p.at - p.room : p.at + p.room));
      const later = coming.filter((c) => c.side === side && c.lo < hi && c.hi > lo && (lo < c.lo || hi > c.hi));
      const crossed = inner.filter((p) => p.lo < lo || p.hi > hi).length + later.length;
      const at = side === 'left' ? Math.min(own, ...outer) : Math.max(own, ...outer);
      const edge = (r: Rect) => (side === 'left' ? r.x : right(r));
      const across = input.lane === undefined ? 0 : railCrossings(side, at, upper, lower, input.lines);
      const cost = CROSSING * (crossed + across) + Math.abs(at - edge(upper)) + Math.abs(at - edge(lower));
      return { side, at, cost };
    });
    const best = tried.reduce<(typeof tried)[number] | undefined>((a, b) => (a && a.cost <= b.cost ? a : b), undefined);
    if (best === undefined) continue;
    const room = where.get(e.id) === 'beside' ? label(e) + 2 * m.labelGap + m.track / 2 : m.track;
    laid.push({ edge: e, upper: up, lower: low, side: best.side, at: best.at, room, lo, hi });
  }
  return laid;
}

/** The rails of a picture laid out: their routes by edge, and the room each frame holding both ends of one needs. */
export interface Railed {
  readonly routes: ReadonlyMap<string, Route>;
  /** How far left and right of its boxes each frame must reach for the rails and texts inside it. */
  readonly reach: ReadonlyMap<string, { readonly left: number; readonly right: number }>;
  /** The texts of rails set over or under an end piece, by edge; the others stand beside their track. */
  readonly texts: ReadonlyMap<string, Rect>;
}

/** A rail laid out as a route: out of its lower end, along its track, into its upper end, turned for the edge. */
function routeOf(l: Laid, boxes: ReadonlyMap<string, Rect>, y: ReadonlyMap<string, number>): Route {
  const [lower, upper] = [boxes.get(l.lower) as Rect, boxes.get(l.upper) as Rect];
  const x = (r: Rect) => (l.side === 'left' ? r.x : right(r));
  const [y1, y2] = [y.get(`${l.edge.id}|lower`) ?? 0, y.get(`${l.edge.id}|upper`) ?? 0];
  const rising: Point[] = [
    [x(lower), y1],
    [l.at, y1],
    [l.at, y2],
    [x(upper), y2],
  ];
  const points = l.edge.from === l.lower ? rising : rising.reverse();
  return { edge: l.edge.id, points, shape: 'orthogonal', fromSide: l.side, toSide: l.side };
}

/** The end pieces of a rail as drawn by `routeOf`. */
function piecesOf(l: Laid, route: Route): RailPieces {
  const [a, b] = [route.points[0] as Point, route.points.at(-1) as Point];
  const [low, up] = l.edge.from === l.lower ? [a, b] : [b, a];
  return { side: l.side, at: l.at, upper: { x: up[0], y: up[1] }, lower: { x: low[0], y: low[1] } };
}

/**
 * Draws the rails (layout plan P8, `LayeredEdge.rail`): out of a side of one end, along the track beside the layers
 * between, into the same side of the other end. A text stands beside the box the line starts from, over the piece
 * out of it where that is the upper end and under it where the lower, else at the other end, where it stands clear
 * there (`pieceText`) and, in a picture with lanes, the line stays in one lane, whose borders are not drawn yet, so its rail needs no room for it beside the track; else beside the track, and the rails are
 * placed anew. A text that belongs at the start of its line (`at: 'start'`) tries the piece it starts from even where
 * the line changes lanes, and beside the track where that piece is not clear. A frame holding both ends holds the rail and its text.
 */
export function drawRails(input: RailInput, m: LayeredMetrics, spec: LayeredSpec): Railed {
  const held = holders(spec);
  const fixed = new Set(spec.nodes.flatMap((n) => (n.sides ? [n.id] : [])));
  const layer = (n: string) => input.layerOf.get(n) ?? 0;
  const first = (e: LayeredEdge): RailTextAt => (layer(e.from) < layer(e.to) ? 'upper' : 'lower');
  const lane = input.lane;
  const inLane = (e: LayeredEdge) => lane === undefined || lane(e.from) === lane(e.to);
  const onPiece = (e: LayeredEdge) => inLane(e) || e.label?.at === 'start';
  const where = new Map(
    input.edges.flatMap((e) => (label(e) > 0 ? [[e.id, onPiece(e) ? first(e) : ('beside' as const)]] : [])),
  );
  for (;;) {
    const laid = place(input, m, held, where);
    const y = railDocks(laid, input.boxes, m, fixed);
    const routes = new Map(laid.map((l) => [l.edge.id, routeOf(l, input.boxes, y)]));
    const texts = new Map<string, Rect>();
    const pieces = new Map(laid.map((l) => [l.edge.id, piecesOf(l, routes.get(l.edge.id) as Route)]));
    const aside = laid.filter((l) => where.get(l.edge.id) === 'beside');
    const clutter = { boxes: [...input.drawn.values()], frames: input.frames.map((f) => f.rect), texts: [] as Rect[] };
    clutter.texts.push(...aside.map((l) => besideText(l.edge, pieces.get(l.edge.id) as RailPieces, m.labelGap)));
    let moved = false;
    for (const l of laid) {
      const at = where.get(l.edge.id);
      if (at === undefined || at === 'beside') continue;
      const lines = [...input.lines, ...[...routes.values()].filter((r) => r.edge !== l.edge.id)];
      const box = pieceText(l.edge, pieces.get(l.edge.id) as RailPieces, at, m.labelGap, { ...clutter, lines });
      if (box === undefined) {
        where.set(l.edge.id, inLane(l.edge) ? nextTextAt(at, first(l.edge)) : 'beside');
        moved = true;
        break;
      }
      texts.set(l.edge.id, box);
      clutter.texts.push(box);
    }
    if (!moved) return { routes, reach: railReach(laid, held, where, m), texts };
  }
}
