import { DEFAULT_THRESHOLDS, type Rect } from '@diagrist/core';
import type { GridLayout, Route } from '../layout.js';
import { boardOf } from '../route/boxes.js';
import type { GridSpec } from '../spec.js';
import { clearOf } from './clear.js';
import { namedOf } from './named.js';
import type { OnLine } from './on-line.js';
import { blockCost, type Found, rectsOf, type SearchOptions, searchBlock } from './search.js';
import type { SeatMark } from './seat.js';
import { markAt, spotsOf } from './spots.js';
import type { EdgeLabel, EdgeText } from './types.js';

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
}

const grown = (r: Rect, by: number): Rect => ({ x: r.x - by, y: r.y - by, w: r.w + 2 * by, h: r.h + 2 * by });

/**
 * Marks and texts of the routes of a channel grid, each clear of boxes, heads, frames that hold neither end of its
 * edge, foreign lines and what was placed before it (`clearOf`). Marks such as flow numbers come first, where the
 * kind put them or the nearest clear spot along their line. Texts stay where `routeTexts` or `onLineTexts` put
 * them when that spot is clear, else take the first clear spot beside or on their line (`searchBlock`); a route whose texts find none moves
 * its mark along the line until they do. Other fields of a mark are kept.
 */
export function signEdges<M extends SeatMark>(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  edgeTexts: readonly EdgeText[],
  marks: readonly M[],
  o: SignOptions,
): { labels: EdgeLabel[]; marks: M[] } {
  const board = boardOf(spec, layout);
  const texts = new Map(edgeTexts.map((t) => [t.edge, t]));
  const named = namedOf(spec, routes, texts, o);
  const clear = clearOf(board, routes, o.avoid ?? []);
  const size = o.mark ?? { w: 0, h: 0, room: 0 };
  const search: SearchOptions = { preferFlat: o.preferFlat === true, ...(o.onLine ? { onLine: o.onLine } : {}) };
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
  const take = (i: number, block: EdgeLabel[]) => {
    chosen.set(i, block);
    for (const r of rectsOf(block, search)) clear.take(r);
  };
  const first = (i: number) => named.filter((l) => l.route === i);
  routes.forEach((_, i) => {
    const block = first(i);
    if (block.length > 0 && blockCost(block, i, clear, search) === 0) take(i, block);
  });
  routes.forEach((r, i) => {
    const text = texts.get(r.edge);
    if (chosen.has(i) || !text || first(i).length === 0) return;
    let found: Found = searchBlock(r, i, text, first(i), clear, spec.metrics, search);
    const mark = marks.find((m) => m.route === i);
    const seat = mark && placed.get(mark);
    if (found.cost > 0 && mark && seat) {
      clear.drop(seat.rect);
      for (const p of free(mark)) {
        put(mark, p);
        const moved = searchBlock(r, i, text, first(i), clear, spec.metrics, search);
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
    take(i, found.block);
  });
  return {
    labels: routes.flatMap((_, i) => chosen.get(i) ?? []),
    marks: marks.map((m) => placed.get(m)?.mark ?? m),
  };
}
