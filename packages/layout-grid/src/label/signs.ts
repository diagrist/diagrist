import { DEFAULT_THRESHOLDS, type Point, type Rect } from '@diagrist/core';
import { segmentsCross } from '../geometry.js';
import type { GridLayout, Route } from '../layout.js';
import { boardOf } from '../route/boxes.js';
import type { GridSpec } from '../spec.js';
import { clearOf } from './clear.js';
import { giveWay, type Seats } from './give-way.js';
import { namedOf } from './named.js';
import type { OnLine } from './on-line.js';
import { blockCost, clearWays, type Found, type SearchOptions, searchBlock, tooWide } from './search.js';
import { markAt, type SeatMark, spotsOf } from './spots.js';
import type { EdgeLabel, EdgeText } from './types.js';
import { rectsOf } from './ways.js';

/** Every how many clear spots of a mark a text that found no room tries again. */
const RETRY = 3;
/** A mark keeps one pixel more from foreign lines than the line check asks of lines past texts, against rounding. */
const LINE_GAP = DEFAULT_THRESHOLDS.clearance + 1;

/** The marks on the routes of a channel grid and how they stand among the texts. */
export interface SignOptions {
  /** Names on the longest horizontal segment, as `LabelOptions.preferFlat`. */
  readonly preferFlat?: boolean;
  /** Texts standing on their line, as `LabelOptions.onLine`. */
  readonly onLine?: OnLine;
  /** Rectangles texts and marks keep clear of, such as decision marks the kind set itself. */
  readonly avoid?: readonly Rect[];
  /** Size of every mark, and the room texts keep from a mark besides the pad all of them keep. */
  readonly mark?: { readonly w: number; readonly h: number; readonly room: number };
  /** Texts already placed, as an adaptive grid's labels: kept where clear instead of where the old rule puts them. */
  readonly placed?: readonly EdgeLabel[];
  /** Signs beside a route, such as decision marks, `w` by `h`, each with the spots the kind offers it. */
  readonly pins?: { readonly w: number; readonly h: number; readonly at: readonly Pin[] };
  /** The left edge of the picture, beyond which a text widens it (`SearchOptions.floor`). */
  readonly floor?: number;
}

/**
 * A sign beside route `route`, with the centres it may take in the order the kind prefers them, each with the point
 * of the route it stands beside: no foreign line may run between the two.
 */
export interface Pin {
  readonly route: number;
  readonly spots: readonly { readonly at: Point; readonly on: Point }[];
}

const grown = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/**
 * Signs, marks and texts of the routes of a channel grid, each clear of boxes, heads, frames that hold neither end of
 * its edge, foreign lines and what was placed before it (`clearOf`). Signs beside a route come first, at the first
 * clear spot the kind offers, else at its first. Marks on the route such as flow numbers follow, where the kind put
 * them or the nearest clear spot along their line. Texts stay where `routeTexts` or `onLineTexts` put them when that
 * spot is clear, else the clear spot beside or on their line that comes least near the texts of other routes
 * (`searchBlock`); a route whose texts find none moves its mark along the line until they do. Then a text that came
 * near a text of another line is sought again with all others seated, so an earlier one gives way to a later one
 * (`giveWay`). Last, a sign that a text could not avoid moves on to its next clear spot. Texts on one of two upright
 * straight lines between the same boxes may stand beside it where no spot on it is clear, since a text across the
 * one meets the other. Other fields of a mark are kept. `crowded` names the routes whose texts found no clear spot,
 * for `gutterRoom`.
 */
export function signEdges<M extends SeatMark>(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  edgeTexts: readonly EdgeText[],
  marks: readonly M[],
  o: SignOptions,
): { labels: EdgeLabel[]; marks: M[]; pins: Point[]; crowded: number[] } {
  const board = boardOf(spec, layout);
  const texts = new Map(edgeTexts.map((t) => [t.edge, t]));
  const named = o.placed ?? namedOf(spec, routes, texts, o);
  const clear = clearOf(board, routes, o.avoid ?? []);
  const size = o.mark ?? { w: 0, h: 0, room: 0 };
  const search: SearchOptions = {
    preferFlat: o.preferFlat === true,
    ...(o.onLine ? { onLine: o.onLine } : {}),
    ...(o.floor === undefined ? {} : { floor: o.floor }),
  };
  const pin = o.pins ?? { w: 0, h: 0, at: [] };
  const between = (spot: Pin['spots'][number], route: number) =>
    routes.some(
      (r, i) =>
        i !== route && r.points.slice(1).some((q, j) => segmentsCross(spot.on, spot.at, r.points[j] as Point, q)),
    );
  const pinCost = (spot: Pin['spots'][number], route: number) =>
    clear.cost(markAt(spot.at, pin.w, pin.h), route, LINE_GAP, false) + (between(spot, route) ? 1 : 0);
  const pinAt = (k: Pin): Point => (k.spots.find((spot) => pinCost(spot, k.route) === 0) ?? k.spots[0])?.at ?? [0, 0];
  const pins = pin.at.map((k) => {
    const spot = pinAt(k);
    const rect = markAt(spot, pin.w, pin.h);
    clear.take(rect);
    return { spot, rect };
  });
  const placed = new Map<M, { mark: M; rect: Rect }>();
  const free = (m: M) =>
    spotsOf(m, routes, size.w, size.h).filter(
      (p) => clear.cost(markAt(p, size.w, size.h), m.route, LINE_GAP, true) === 0,
    );
  const put = (m: M, p: readonly [number, number] | undefined) => {
    const at = p ?? [m.x, m.y];
    const seat = { mark: { ...m, x: at[0], y: at[1] }, rect: grown(markAt(at, size.w, size.h), size.room) };
    clear.take(seat.rect);
    placed.set(m, seat);
  };
  for (const m of marks) put(m, free(m)[0]);
  const chosen = new Map<number, EdgeLabel[]>();
  const crowded: number[] = [];
  const take = (i: number, block: EdgeLabel[]) => {
    chosen.set(i, block);
    for (const r of rectsOf(block, search)) clear.take(r, i);
  };
  const first = (i: number) => named.filter((l) => l.route === i);
  const ends = new Map(spec.edges.map((e) => [e.id, [e.from, e.to].sort().join('|')]));
  const pairs = routes.map((r) => ends.get(r.edge));
  const upright = (r: Route | undefined) => r?.points.length === 2 && r.points[0]?.[0] === r.points[1]?.[0];
  const twin = (i: number) =>
    upright(routes[i]) && pairs.some((p, k) => k !== i && p !== undefined && p === pairs[i] && upright(routes[k]));
  const searchOf = (i: number): SearchOptions => (twin(i) ? { ...search, beside: true } : search);
  routes.forEach((_, i) => {
    const block = first(i);
    if (block.length > 0 && !tooWide(block, spec.metrics) && blockCost(block, i, clear, search) === 0) take(i, block);
  });
  routes.forEach((r, i) => {
    const text = texts.get(r.edge);
    if (chosen.has(i) || !text || first(i).length === 0) return;
    let found: Found = searchBlock(r, i, text, first(i), clear, spec.metrics, searchOf(i));
    const mark = marks.find((m) => m.route === i);
    const seat = mark && placed.get(mark);
    if (found.cost > 0 && mark && seat) {
      clear.drop(seat.rect);
      for (const p of free(mark).filter((_, k) => k % RETRY === 0)) {
        put(mark, p);
        const moved = searchBlock(r, i, text, first(i), clear, spec.metrics, searchOf(i));
        if (moved.cost === 0) {
          found = moved;
          break;
        }
        clear.drop((placed.get(mark) as { rect: Rect }).rect);
      }
      if (found.cost > 0) {
        placed.set(mark, seat);
        clear.take(seat.rect);
      }
    }
    if (found.cost > 0) crowded.push(i);
    take(i, found.block);
  });
  const seek = (i: number) => {
    const r = routes[i] as Route;
    const text = texts.get(r.edge);
    const found = text ? searchBlock(r, i, text, first(i), clear, spec.metrics, searchOf(i)) : undefined;
    return { seat: found?.block ?? chosen.get(i) ?? [], cost: found?.cost ?? 0 };
  };
  const rects = (block: readonly EdgeLabel[]) => rectsOf(block, search);
  const seats: Seats<EdgeLabel[]> = {
    chosen,
    near: (i, block) => rects(block).reduce((n, r) => n + clear.crowding(r, i), 0),
    cost: (i, block) => blockCost(block, i, clear, searchOf(i)),
    seek,
    ways: (i) => {
      const r = routes[i] as Route;
      const text = texts.get(r.edge);
      return text ? clearWays(r, i, text, clear, spec.metrics, searchOf(i)) : [];
    },
    take: (i, block) => {
      for (const r of rects(block)) clear.take(r, i);
    },
    drop: (_, block) => {
      for (const r of rects(block)) clear.drop(r);
    },
  };
  const cleared = new Set(giveWay(seats));
  const moved = pin.at.map((k, i) => {
    const { spot, rect } = pins[i] as (typeof pins)[number];
    clear.drop(rect);
    const next = pinCost({ at: spot, on: spot }, k.route) === 0 ? spot : pinAt(k);
    clear.take(markAt(next, pin.w, pin.h));
    return next;
  });
  return {
    labels: routes.flatMap((_, i) => chosen.get(i) ?? []),
    marks: marks.map((m) => placed.get(m)?.mark ?? m),
    pins: moved,
    crowded: crowded.filter((i) => !cleared.has(i)),
  };
}
