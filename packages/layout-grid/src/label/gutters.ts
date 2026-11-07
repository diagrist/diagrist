import type { GridLayout, Route } from '../layout.js';
import type { GridSpec } from '../spec.js';
import {
  alongGrowth,
  alongNeed,
  blocksOf,
  crosses,
  frameSides,
  LINE_GAP,
  meet,
  type Piece,
  piecesOf,
  span,
} from './gutter-text.js';
import type { OnLine } from './on-line.js';
import type { EdgeText } from './types.js';

/**
 * The least gaps a channel grid asks for after its signs were placed: right of each column but the last and below
 * each row but the last. A gap that may stay as it is asks 0.
 */
export interface GutterRoom {
  readonly cols: readonly number[];
  readonly rows: readonly number[];
  /** Per gap, the room its row of tracks leaves at its near and far border for texts along it (`GridRow.keep`). */
  readonly keep?: { readonly cols: readonly Keep[]; readonly rows: readonly Keep[] };
}

/** Room at the near and the far border of a gap. */
type Keep = readonly [number, number];

/** A gap between two columns or rows: where it starts and ends across, its number and axis. */
interface Gap {
  readonly axis: 'col' | 'row';
  readonly index: number;
  readonly lo: number;
  readonly hi: number;
}

const gapsOf = (axis: Gap['axis'], spans: readonly (readonly [number, number])[]): Gap[] =>
  spans.slice(1).map(([at], index) => {
    const [x, size] = spans[index] as readonly [number, number];
    return { axis, index, lo: x + size, hi: at };
  });

/**
 * Where the tracks of a gap's row lie, as the channel stage laid them (`Route.tracks`), wherever they stand: a row of
 * many tracks spreads beyond a narrow gap, into the boxes beside it. A track counts while its route still runs along
 * it, across the gap.
 */
function rowOf(g: Gap, routes: readonly Route[], pieces: readonly Piece[][]): number[] {
  const along = (p: Piece, x: number) =>
    p.upright === (g.axis === 'col') && Math.abs(p.a[g.axis === 'col' ? 0 : 1] - x) < 0.5;
  const row = routes.flatMap((r, i) =>
    (r.tracks ?? [])
      .filter((t) => t.axis === g.axis && t.gap === g.index && (pieces[i] ?? []).some((p) => along(p, t.at)))
      .map((t) => t.at),
  );
  return [...new Set(row)];
}

/** The gaps between the columns of a grid and between its rows. */
const gapsIn = (layout: GridLayout): Gap[] => [
  ...gapsOf(
    'col',
    layout.cols.map((c) => [c.x, c.w]),
  ),
  ...gapsOf(
    'row',
    layout.rows.map((r) => [r.y, r.h]),
  ),
];

/**
 * Whether the row of tracks of a gap stands beyond the gap, into the boxes beside it (ADR 0038, D2): then the gap
 * grows as `gutterRoom` asks, whatever that does to the texts.
 */
export function leavesGap(layout: GridLayout, routes: readonly Route[]): boolean {
  const pieces = routes.map((r) => piecesOf(r.points));
  return gapsIn(layout).some((g) => rowOf(g, routes, pieces).some((x) => x < g.lo || x > g.hi));
}

/** The narrowest width of a text's blocks, and the least height. */
const leastOf = (blocks: ReturnType<typeof blocksOf>) => ({
  narrow: Math.min(...blocks.map((s) => s.w)),
  flat: Math.min(...blocks.map((s) => s.h)),
});

/**
 * How much a gap must grow for a text beside a piece across it, `need` deep, to fit between the piece and the gap's
 * border on one side: the lanes of a gap stay centred, so a side grows by half of what the gap grows. A side with
 * another lane between the piece and the border cannot grow.
 */
function besideGrowth(at: number, gap: Gap, lanes: readonly number[], need: number): number {
  const left = lanes.some((x) => x < at) ? Infinity : 2 * (need - (at - gap.lo));
  const right = lanes.some((x) => x > at) ? Infinity : 2 * (need - (gap.hi - at));
  return Math.min(left, right);
}

/**
 * The room each gap of a channel grid needs (ADR 0038, D2): for the lanes of its Zs, `laneGap` from either border,
 * the whole row of tracks as the channel stage laid it (`rowOf`), and for the texts of the `crowded` routes, whose
 * search found no clear spot. A text asks of the gap of the piece where it needs the least growth: beside a piece
 * that crosses the gap, or along a piece that runs into or over it, on a stretch between its ends, the gap's lanes
 * and the frame sides it crosses (`alongGrowth`), as long as its shortest block that stands clear of the pieces
 * beside it (`alongNeed`); texts on their line (`onLine`) keep their flattest block. A kind sets the room as `GridColumn.gap` and `GridRow.gap` and places a second time; whether that
 * helped, only the second search tells.
 */
export function gutterRoom(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  edgeTexts: readonly EdgeText[],
  crowded: readonly number[],
  onLine?: OnLine,
): GutterRoom {
  const m = spec.metrics;
  const gaps = gapsIn(layout);
  const width = (g: Gap) => g.hi - g.lo;
  const need = new Map<Gap, number>();
  const ask = (g: Gap, gap: number) => need.set(g, Math.max(need.get(g) ?? 0, gap));
  const pieces = routes.map((r) => piecesOf(r.points));
  const across = (g: Gap, p: Piece) => p.upright === (g.axis === 'col');
  const at = (g: Gap, p: Piece) => (g.axis === 'col' ? p.a[0] : p.a[1]);
  const inside = (g: Gap, p: Piece) => across(g, p) && at(g, p) > g.lo && at(g, p) < g.hi;
  const outlines = (g: Gap, p: Piece) =>
    frameSides(layout, g.axis === 'col').filter((q) => inside(g, q) && crosses(q, p));
  const lanesOf = (g: Gap, besides: Piece | undefined) =>
    pieces.flatMap((list) =>
      list.filter((q) => inside(g, q) && (!besides || meet(span(q, q.upright), span(besides, q.upright)))),
    );
  for (const g of gaps) {
    for (const p of lanesOf(g, undefined)) {
      const lanes = [...new Set(lanesOf(g, p).map((q) => at(g, q)))];
      if (lanes.length > 1) ask(g, Math.max(...lanes) - Math.min(...lanes) + 2 * m.laneGap);
    }
    const row = rowOf(g, routes, pieces);
    if (row.length > 1) ask(g, Math.max(...row) - Math.min(...row) + 2 * m.laneGap);
  }
  const texts = new Map(edgeTexts.map((t) => [t.edge, t]));
  for (const i of crowded) {
    const route = routes[i];
    const text = route && texts.get(route.edge);
    if (!route || !text) continue;
    const blocks = blocksOf(text, m);
    const size = leastOf(blocks);
    let best: { gap: Gap; growth: number } | undefined;
    for (const p of pieces[i] ?? []) {
      for (const g of gaps) {
        let growth = Infinity;
        const deep = g.axis === 'col' ? size.narrow : size.flat;
        if (inside(g, p)) {
          const lanes = lanesOf(g, p)
            .filter((q) => q !== p)
            .map((q) => at(g, q));
          growth = besideGrowth(at(g, p), g, lanes, deep + m.labelGap + LINE_GAP);
        } else if (!across(g, p)) {
          const [lo, hi] = span(p, p.upright);
          if (hi <= g.lo || lo >= g.hi) continue;
          const part = [Math.max(lo, g.lo), Math.min(hi, g.hi)] as const;
          const long = alongNeed(blocks, p, part, pieces.flat(), m, onLine !== undefined);
          const lanes = lanesOf(g, undefined).map((q) => at(g, q));
          growth = alongGrowth(
            [g.lo, g.hi],
            part,
            hi - lo,
            lanes,
            outlines(g, p).map((q) => at(g, q)),
            long,
          );
        }
        if (growth > 0 && growth < Infinity && (!best || growth < best.growth)) best = { gap: g, growth };
      }
    }
    if (best) ask(best.gap, width(best.gap) + best.growth);
  }
  const up = (n: number) => (n > 0 ? Math.ceil(n / m.grid) * m.grid : 0);
  const of = (axis: Gap['axis']) =>
    gaps
      .filter((g) => g.axis === axis)
      .map((g) => {
        const n = need.get(g) ?? 0;
        return n > width(g) ? up(n) : 0;
      });
  return { cols: of('col'), rows: of('row') };
}

/**
 * The spec with the gaps of `room` as least gaps of its columns and rows and the room they keep at their borders, for
 * a second run of `placeGrid`.
 */
export function widen(spec: GridSpec, room: GutterRoom): GridSpec {
  const more = (own: number | undefined, asked: number | undefined) =>
    asked ? { gap: Math.max(own ?? 0, asked) } : {};
  const held = (keep: Keep | undefined) => (keep && (keep[0] > 0 || keep[1] > 0) ? { keep } : {});
  return {
    ...spec,
    cols: spec.cols.map((c, i) => ({ ...c, ...more(c.gap, room.cols[i]), ...held(room.keep?.cols[i]) })),
    rows: spec.rows.map((r, i) => ({ ...r, ...more(r.gap, room.rows[i]), ...held(room.keep?.rows[i]) })),
  };
}
