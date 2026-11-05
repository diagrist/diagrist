import { DEFAULT_THRESHOLDS, type Point } from '@diagrist/core';
import type { GridLayout, Route } from '../layout.js';
import type { GridSpec } from '../spec.js';
import { type Line, stacks, widthOf } from './blocks.js';
import type { EdgeText } from './types.js';

/**
 * The least gaps a channel grid asks for after its signs were placed: right of each column but the last and below
 * each row but the last. A gap that may stay as it is asks 0.
 */
export interface GutterRoom {
  readonly cols: readonly number[];
  readonly rows: readonly number[];
}

/** A gap between two columns or rows: where it starts and ends across, its number and axis. */
interface Gap {
  readonly axis: 'col' | 'row';
  readonly index: number;
  readonly lo: number;
  readonly hi: number;
}

/** A piece of a route that runs straight, with the axis it runs along. */
interface Piece {
  readonly a: Point;
  readonly b: Point;
  readonly upright: boolean;
}

/** Room a text keeps from a foreign line, as the search for spots asks, and from boxes. */
const LINE_GAP = DEFAULT_THRESHOLDS.labelClear + 1;
const PAD = 4;

const gapsOf = (axis: Gap['axis'], spans: readonly (readonly [number, number])[]): Gap[] =>
  spans.slice(1).map(([at], index) => {
    const [x, size] = spans[index] as readonly [number, number];
    return { axis, index, lo: x + size, hi: at };
  });

const piecesOf = (points: readonly Point[]): Piece[] =>
  points.slice(1).map((b, i) => {
    const a = points[i] as Point;
    return { a, b, upright: a[0] === b[0] };
  });

const span = (p: Piece, upright: boolean): readonly [number, number] => {
  const k = upright ? 1 : 0;
  return [Math.min(p.a[k], p.b[k]), Math.max(p.a[k], p.b[k])];
};

const meet = (a: readonly [number, number], b: readonly [number, number]): boolean => a[0] < b[1] && b[0] < a[1];

/** The narrowest way a text stacks, and the flattest: widths and heights of its blocks. */
function sizes(text: EdgeText, m: GridSpec['metrics']): { narrow: number; tall: number; wide: number; flat: number } {
  const all: Line[][] = [...stacks(text, true), ...stacks(text, false)];
  const measured = all.map((lines) => ({ w: widthOf(lines, m), h: lines.length * m.labelLineH }));
  const narrow = measured.reduce((a, b) => (b.w < a.w ? b : a), measured[0] ?? { w: 0, h: 0 });
  const flat = measured.reduce((a, b) => (b.h < a.h ? b : a), measured[0] ?? { w: 0, h: 0 });
  return { narrow: narrow.w, tall: narrow.h, wide: flat.w, flat: flat.h };
}

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
 * and for the texts of the `crowded` routes, whose search found no clear spot. A text asks of the gap of the piece
 * where it needs the least growth: beside a piece that crosses the gap, or along a piece that runs into or over it,
 * between the end of the piece or the gap's border and its outermost lane. A kind sets the room as `GridColumn.gap` and `GridRow.gap` and places a
 * second time; whether that helped, only the second search tells.
 */
export function gutterRoom(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  edgeTexts: readonly EdgeText[],
  crowded: readonly number[],
): GutterRoom {
  const m = spec.metrics;
  const gaps = [
    ...gapsOf(
      'col',
      layout.cols.map((c) => [c.x, c.w]),
    ),
    ...gapsOf(
      'row',
      layout.rows.map((r) => [r.y, r.h]),
    ),
  ];
  const width = (g: Gap) => g.hi - g.lo;
  const need = new Map<Gap, number>();
  const ask = (g: Gap, gap: number) => need.set(g, Math.max(need.get(g) ?? 0, gap));
  const pieces = routes.map((r) => piecesOf(r.points));
  const across = (g: Gap, p: Piece) => p.upright === (g.axis === 'col');
  const at = (g: Gap, p: Piece) => (g.axis === 'col' ? p.a[0] : p.a[1]);
  const inside = (g: Gap, p: Piece) => across(g, p) && at(g, p) > g.lo && at(g, p) < g.hi;
  const lanesOf = (g: Gap, besides: Piece | undefined) =>
    pieces.flatMap((list) =>
      list.filter((q) => inside(g, q) && (!besides || meet(span(q, q.upright), span(besides, q.upright)))),
    );
  for (const g of gaps) {
    const lanes = lanesOf(g, undefined).map((q) => at(g, q));
    if (lanes.length > 1) ask(g, Math.max(...lanes) - Math.min(...lanes) + 2 * m.laneGap);
  }
  const texts = new Map(edgeTexts.map((t) => [t.edge, t]));
  for (const i of crowded) {
    const route = routes[i];
    const text = route && texts.get(route.edge);
    if (!route || !text) continue;
    const size = sizes(text, m);
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
          const lanes = lanesOf(g, undefined).map((q) => at(g, q));
          const long = (g.axis === 'col' ? size.wide : size.tall) + 2 * PAD;
          const room =
            lanes.length === 0
              ? hi - lo
              : Math.max(Math.min(...lanes) - Math.max(lo, g.lo), Math.min(hi, g.hi) - Math.max(...lanes)) - LINE_GAP;
          growth = lanes.length === 0 ? long - room : 2 * (long - room);
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

/** The spec with the gaps of `room` as least gaps of its columns and rows, for a second run of `placeGrid`. */
export function widen(spec: GridSpec, room: GutterRoom): GridSpec {
  const more = (own: number | undefined, asked: number | undefined) =>
    asked ? { gap: Math.max(own ?? 0, asked) } : {};
  return {
    ...spec,
    cols: spec.cols.map((c, i) => ({ ...c, ...more(c.gap, room.cols[i]) })),
    rows: spec.rows.map((r, i) => ({ ...r, ...more(r.gap, room.rows[i]) })),
  };
}
