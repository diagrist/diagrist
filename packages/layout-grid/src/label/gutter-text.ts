import { DEFAULT_THRESHOLDS, type Point } from '@diagrist/core';
import type { GridLayout } from '../layout.js';
import type { GridSpec } from '../spec.js';
import { type Line, stacks, widthOf } from './blocks.js';
import type { EdgeText } from './types.js';

/** A piece of a route or of a frame's outline that runs straight, with the axis it runs along. */
export interface Piece {
  readonly a: Point;
  readonly b: Point;
  readonly upright: boolean;
}

/** A block of a text: its width and height. */
interface Size {
  readonly w: number;
  readonly h: number;
}

/** Room a text keeps from a foreign line, as the search for spots asks, and from boxes. */
export const LINE_GAP: number = DEFAULT_THRESHOLDS.labelClear + 1;
/** Room a text beside its line keeps from either end of the stretch it stands on. */
const PAD = 4;

export const piecesOf = (points: readonly Point[]): Piece[] =>
  points.slice(1).map((b, i) => {
    const a = points[i] as Point;
    return { a, b, upright: a[0] === b[0] };
  });

export const span = (p: Piece, upright: boolean): readonly [number, number] => {
  const k = upright ? 1 : 0;
  return [Math.min(p.a[k], p.b[k]), Math.max(p.a[k], p.b[k])];
};

export const meet = (a: readonly [number, number], b: readonly [number, number]): boolean => a[0] < b[1] && b[0] < a[1];

/** The two sides of each frame of `layout` that run upright, or else the two that run across. */
export const frameSides = (layout: GridLayout, upright: boolean): Piece[] =>
  layout.groups.flatMap(({ rect: r }): Piece[] =>
    [0, upright ? r.w : r.h].map((d) =>
      upright
        ? { a: [r.x + d, r.y], b: [r.x + d, r.y + r.h], upright }
        : { a: [r.x, r.y + d], b: [r.x + r.w, r.y + d], upright },
    ),
  );

/** Whether piece `q` runs across piece `p`, the line of `p` passing between the ends of `q`. */
export const crosses = (q: Piece, p: Piece): boolean => {
  const [lo, hi] = span(q, q.upright);
  const c = q.upright ? p.a[1] : p.a[0];
  return c > lo && c < hi;
};

/** The blocks a text may take, as the search for spots stacks it. */
export function blocksOf(text: EdgeText, m: GridSpec['metrics']): Size[] {
  const all: Line[][] = [...stacks(text, true, m), ...stacks(text, false, m)];
  return all.map((lines) => ({ w: widthOf(lines, m), h: lines.length * m.labelLineH }));
}

/**
 * The stretch a text beside its line needs along piece `p`, of which `part` lies in a gap: its shortest block that
 * stands deep enough on the roomier side of `p`, up to the nearest piece of `others` parallel to it, else its block
 * that stands least deep, and a pad at either end. A text on its line (`onLine`) keeps the block that stands least
 * deep, as it reaches to both sides of its line.
 */
export function alongNeed(
  blocks: readonly Size[],
  p: Piece,
  part: readonly [number, number],
  others: readonly Piece[],
  m: GridSpec['metrics'],
  onLine: boolean,
): number {
  const k = p.upright ? 0 : 1;
  const off = others
    .filter((q) => q !== p && q.upright === p.upright && q.a[k] !== p.a[k] && meet(span(q, q.upright), part))
    .map((q) => q.a[k] - p.a[k]);
  const side = (list: readonly number[]) => (list.length === 0 ? Infinity : Math.min(...list));
  const roomier = Math.max(side(off.filter((d) => d > 0)), side(off.filter((d) => d < 0).map((d) => -d)));
  const depth = onLine ? -Infinity : roomier - m.labelGap - LINE_GAP;
  const [along, deep] = p.upright ? (['h', 'w'] as const) : (['w', 'h'] as const);
  const least = (list: readonly Size[], key: 'w' | 'h') => Math.min(...list.map((s) => s[key]));
  const fits = blocks.filter((s) => s[deep] <= depth);
  const flattest = least(blocks, deep);
  const chosen = fits.length > 0 ? fits : blocks.filter((s) => s[deep] === flattest);
  return least(chosen, along) + 2 * PAD;
}

/** A point that bounds a stretch of a piece in a gap, with how far it moves as the gap grows by one. */
interface Mark {
  readonly at: number;
  readonly moves: number;
  readonly line: boolean;
}

/** How much a gap must grow for a text along it, and the border the text's stretch touches, where it keeps room. */
export interface AlongGrowth {
  readonly growth: number;
  readonly side?: 0 | 1 | undefined;
}

/**
 * How much the gap from `lo` to `hi` must grow for a text `long` along a piece over it, from `from` to `to` within the
 * gap (`whole` the piece's length), on the stretch between two marks where it needs the least. The marks are the
 * piece's ends, the lanes of the gap and the frame sides it crosses; a stretch keeps `LINE_GAP` from a lane or side.
 * As the gap grows, the far border moves with it, the centred lanes and an end on a lane by half, and a frame side
 * with the border it is nearer, so a stretch grows by how far its marks part. A stretch between a border and the
 * nearest lane grows by the whole growth instead, since the gap keeps that room at that border and the lanes stand
 * off its middle (`GridRow.keep`); such a stretch names its border. Between two lanes a text is not asked.
 */
export function alongGrowth(
  [lo, hi]: readonly [number, number],
  [from, to]: readonly [number, number],
  whole: number,
  lanes: readonly number[],
  sides: readonly number[],
  long: number,
): AlongGrowth {
  if (lanes.length + sides.length === 0) return { growth: long - whole };
  const within = (at: number) => at > from && at < to;
  const marks: Mark[] = [
    { at: from, moves: from === lo ? 0 : 0.5, line: false },
    ...lanes.filter(within).map((at) => ({ at, moves: 0.5, line: true })),
    ...sides.filter(within).map((at) => ({ at, moves: at - lo < hi - at ? 0 : 1, line: true })),
    { at: to, moves: to === hi ? 1 : 0.5, line: false },
  ].sort((a, b) => a.at - b.at);
  const centred = (k: Mark) => k.moves === 0.5;
  let least: AlongGrowth = { growth: Infinity };
  marks.slice(1).forEach((b, i) => {
    const a = marks[i] as Mark;
    if (a.line && b.line && centred(a) && centred(b)) return;
    const free = b.at - a.at - LINE_GAP * (Number(a.line) + Number(b.line));
    const side = a.at === lo && centred(b) ? 0 : b.at === hi && centred(a) ? 1 : undefined;
    const rate = side === undefined ? b.moves - a.moves : 1;
    const growth = free >= long ? 0 : rate > 0 ? (long - free) / rate : Infinity;
    if (growth < least.growth) least = { growth, side };
  });
  return least;
}
