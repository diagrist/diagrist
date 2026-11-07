import type { GridLayout, Route } from '../layout.js';
import type { GridSpec } from '../spec.js';
import { type Gap, gapsIn, rowOf } from './gaps.js';
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
import type { EdgeLabel, EdgeText } from './types.js';

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
 * How far a text's box, from `a` to `b` across a gap and from `c` to `d` along it, reaches within `LINE_GAP` of a lane
 * at `x` that runs from `lo` to `hi` along the gap, and the border on the side of the lane the box's middle is on.
 */
function besideLane([a, b, c, d]: readonly number[], x: number, [lo, hi]: readonly [number, number]) {
  if (lo >= (d as number) || hi <= (c as number)) return undefined;
  const side: 0 | 1 = (a as number) + (b as number) < 2 * x ? 0 : 1;
  const missing = side === 0 ? (b as number) - (x - LINE_GAP) : x + LINE_GAP - (a as number);
  return missing > 0 ? { side, missing } : undefined;
}

/**
 * The room each gap of a channel grid needs (ADR 0038, D2): for the lanes of its Zs, `laneGap` from either border,
 * the whole row of tracks as the channel stage laid it (`rowOf`), both besides the room the gap keeps at its
 * borders, and for the texts of the `crowded` routes, whose search found no clear spot. A text asks of the gap of
 * the piece where it needs the least growth: beside a piece that crosses the gap, or along a piece that runs into or
 * over it, on a stretch between its ends, the gap's lanes and the frame sides it crosses (`alongGrowth`), as long as
 * its shortest block that stands clear of the pieces beside it (`alongNeed`); texts on their line (`onLine`) keep
 * their flattest block. A stretch at a border keeps what it grows at that border (`GutterRoom.keep`). A crowded text
 * that found no gap to grow and stands (`labels`) within `LINE_GAP` of a lane asks that gap for the missing room on
 * its side of the lane, kept at that border, so the lane moves off the text. A kind sets the room as `GridColumn.gap`
 * and `GridRow.gap` and places a second time; whether that helped, only the second search tells.
 */
export function gutterRoom(
  spec: GridSpec,
  layout: GridLayout,
  routes: readonly Route[],
  edgeTexts: readonly EdgeText[],
  crowded: readonly number[],
  onLine?: OnLine,
  labels: readonly EdgeLabel[] = [],
): GutterRoom {
  const m = spec.metrics;
  const up = (n: number) => (n > 0 ? Math.ceil(n / m.grid) * m.grid : 0);
  const gaps = gapsIn(layout);
  const width = (g: Gap) => g.hi - g.lo;
  const need = new Map<Gap, number>();
  const ask = (g: Gap, gap: number) => need.set(g, Math.max(need.get(g) ?? 0, gap));
  const given = (g: Gap): Keep => (g.axis === 'col' ? spec.cols : spec.rows)[g.index]?.keep ?? [0, 0];
  const keep = new Map(gaps.map((g) => [g, [...given(g)] as [number, number]]));
  const hold = (g: Gap, side: 0 | 1, growth: number) => {
    ask(g, width(g) + growth);
    (keep.get(g) as [number, number])[side] += up(growth);
  };
  const kept = (g: Gap) => given(g)[0] + given(g)[1] + 2 * m.laneGap;
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
      if (lanes.length > 1) ask(g, Math.max(...lanes) - Math.min(...lanes) + kept(g));
    }
    const row = rowOf(g, routes, pieces);
    if (row.length > 1) ask(g, Math.max(...row) - Math.min(...row) + kept(g));
  }
  const texts = new Map(edgeTexts.map((t) => [t.edge, t]));
  for (const i of crowded) {
    const route = routes[i];
    const text = route && texts.get(route.edge);
    if (!route || !text) continue;
    const blocks = blocksOf(text, m);
    const size = leastOf(blocks);
    let best: { gap: Gap; growth: number; side?: 0 | 1 | undefined } | undefined;
    for (const p of pieces[i] ?? []) {
      for (const g of gaps) {
        let along: { growth: number; side?: 0 | 1 | undefined } = { growth: Infinity };
        const deep = g.axis === 'col' ? size.narrow : size.flat;
        if (inside(g, p)) {
          const lanes = lanesOf(g, p)
            .filter((q) => q !== p)
            .map((q) => at(g, q));
          along = { growth: besideGrowth(at(g, p), g, lanes, deep + m.labelGap + LINE_GAP) };
        } else if (!across(g, p)) {
          const [lo, hi] = span(p, p.upright);
          if (hi <= g.lo || lo >= g.hi) continue;
          const part = [Math.max(lo, g.lo), Math.min(hi, g.hi)] as const;
          const long = alongNeed(blocks, p, part, pieces.flat(), m, onLine !== undefined);
          const lanes = lanesOf(g, undefined).map((q) => at(g, q));
          along = alongGrowth(
            [g.lo, g.hi],
            part,
            hi - lo,
            lanes,
            outlines(g, p).map((q) => at(g, q)),
            long,
          );
        }
        const { growth, side } = along;
        if (growth > 0 && growth < Infinity && (!best || growth < best.growth)) best = { gap: g, growth, side };
      }
    }
    if (best?.side !== undefined) hold(best.gap, best.side, best.growth);
    else if (best) ask(best.gap, width(best.gap) + best.growth);
    else
      for (const { box } of labels.filter((l) => l.route === i))
        for (const g of gaps) {
          const [x1, x2, y1, y2] = [box.x, box.x + box.w, box.y, box.y + box.h];
          for (const q of lanesOf(g, undefined)) {
            const short = besideLane(
              g.axis === 'col' ? [x1, x2, y1, y2] : [y1, y2, x1, x2],
              at(g, q),
              span(q, q.upright),
            );
            if (short) hold(g, short.side, short.missing);
          }
        }
  }
  const of = (axis: Gap['axis']) =>
    gaps
      .filter((g) => g.axis === axis)
      .map((g) => {
        const n = need.get(g) ?? 0;
        return n > width(g) ? up(n) : 0;
      });
  const keeps = (axis: Gap['axis']) => gaps.filter((g) => g.axis === axis).map((g) => keep.get(g) as Keep);
  return { cols: of('col'), rows: of('row'), keep: { cols: keeps('col'), rows: keeps('row') } };
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
