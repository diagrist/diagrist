import type { Rect } from '../geometry.js';
import { avoidableBends } from './avoidable.js';
import { lengthOf, segmentsOf, TOLERANCE, tenth } from './lines.js';
import { crossings, foreignPairs, parallelFindings } from './pairs.js';
import { cx } from './rects.js';
import type { LineInput } from './types.js';

/**
 * The soft measures of a picture's lines, so a change to a layout can show whether it made pictures better: what
 * the algorithms minimise, recorded per picture.
 */
export interface LineMetrics {
  readonly lines: number;
  /** Points where two lines outside a common bundle cross (Q1), however many lines there are. */
  readonly crossings: number;
  /**
   * Stretches where two lines outside a common bundle lie on one another, less than a pixel apart, so the picture
   * hides which line goes where.
   */
  readonly overlaps: number;
  /** Bends of all lines together, and of the line with the most (Q3). */
  readonly bends: number;
  readonly maxBends: number;
  /** Lines that bend although their boxes would let a straight line join them (`avoidableBends`, Q15). */
  readonly avoidable: number;
  /** Length of all lines, each times its weight (Q13). */
  readonly length: number;
  /**
   * Boxes whose neighbours below them, two or more, are not centred under them within 4 pixels, and the sum of
   * their offsets (Q11).
   */
  readonly parentsOff: number;
  readonly parentOffset: number;
  /** A box with one neighbour below, which has it as its one neighbour above, not exactly under it, and the sum (Q12). */
  readonly childrenOff: number;
  readonly childOffset: number;
  /** Size of the picture (Q14). */
  readonly width: number;
  readonly height: number;
  /** The longer side of the picture over the shorter, 1 for a square (Q14). */
  readonly aspect: number;
}

/** Off-centre by more than this many pixels counts for Q11. */
const CENTRED = 4;

/** The soft measures of the lines of a picture (Q1, Q3, Q11 to Q15 of the layout plan). */
export function lineMetrics(input: LineInput): LineMetrics {
  const pairs = foreignPairs(input.routes);
  const segments = input.routes.map(segmentsOf);
  const bends = segments.map((s) => Math.max(0, s.length - 1));
  const length = input.routes.reduce(
    (sum, r, i) => sum + (r.weight ?? 1) * (segments[i] ?? []).reduce((l, s) => l + lengthOf(s), 0),
    0,
  );
  const { parentsOff, parentOffset, childrenOff, childOffset } = lineCentring(input);
  const width = input.width ?? extent(input, (r) => r.x + r.w, 0);
  const height = input.height ?? extent(input, (r) => r.y + r.h, 1);
  return {
    lines: input.routes.length,
    crossings: pairs.reduce((n, p) => n + crossings(p).length, 0),
    overlaps: parallelFindings(pairs, 2 * TOLERANCE).length,
    bends: bends.reduce((a, b) => a + b, 0),
    maxBends: Math.max(0, ...bends),
    avoidable: avoidableBends(input),
    length: tenth(length),
    parentsOff,
    parentOffset: tenth(parentOffset),
    childrenOff,
    childOffset: tenth(childOffset),
    width: tenth(width),
    height: tenth(height),
    aspect: Math.min(width, height) > 0 ? tenth(Math.max(width, height) / Math.min(width, height)) : 1,
  };
}

function extent(input: LineInput, far: (r: Rect) => number, axis: 0 | 1): number {
  const rects = [
    ...input.nodes.map((n) => n.rect),
    ...(input.frames ?? []).map((f) => f.rect),
    ...(input.labels ?? []).map((l) => l.box),
    ...(input.texts ?? []).map((t) => t.rect),
  ];
  return Math.max(0, ...rects.map(far), ...input.routes.flatMap((r) => r.points.map((p) => p[axis])));
}

/** Boxes off the middle of their children and children off their one parent, by `lineCentring`. */
export interface LineCentring {
  readonly parentsOff: number;
  readonly parentOffset: number;
  readonly childrenOff: number;
  readonly childOffset: number;
}

/**
 * Whether a line is taken round the boxes between its ends: it leaves one box by a side and enters the other by a
 * side, while one box stands above the other. Such a line makes neither box the parent of the other, so it sets off
 * no box from the middle of the other, nor does it stand beside it.
 */
function takenRound(r: LineInput['routes'][number], rects: ReadonlyMap<string, Rect>): boolean {
  const [a, b, c, d] = [r.points[0], r.points[1], r.points.at(-2), r.points.at(-1)];
  const [p, q] = [rects.get(r.from), rects.get(r.to)];
  if (a === undefined || b === undefined || c === undefined || d === undefined || p === undefined || q === undefined)
    return false;
  return a[1] === b[1] && c[1] === d[1] && (p.y + p.h <= q.y || q.y + q.h <= p.y);
}

/**
 * How far boxes stand from the middle of their neighbours below (Q11) and single children from their parent (Q12),
 * as `lineMetrics` counts them, by the lines that are not taken round the boxes between their ends (`takenRound`); a
 * layout may hand only the lines it wants centred, such as those of a hierarchy.
 */
export function lineCentring(input: LineInput): LineCentring {
  const all = new Map(input.nodes.map((n) => [n.id, n.rect]));
  const rects = new Map(input.nodes.filter((n) => n.owner === undefined).map((n) => [n.id, n.rect]));
  const neighbours = new Map<string, Set<string>>();
  for (const r of input.routes) {
    if (r.from === r.to || !rects.has(r.from) || !rects.has(r.to) || takenRound(r, all)) continue;
    neighbours.set(r.from, (neighbours.get(r.from) ?? new Set()).add(r.to));
    neighbours.set(r.to, (neighbours.get(r.to) ?? new Set()).add(r.from));
  }
  const below = (a: Rect, b: Rect) => {
    const down = b.y - (a.y + a.h);
    return down >= -TOLERANCE && down >= Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  };
  const around = (id: string) => {
    const rect = rects.get(id) as Rect;
    const all = [...(neighbours.get(id) ?? [])].sort().map((n) => rects.get(n) as Rect);
    return {
      rect,
      under: all.filter((r) => below(rect, r)),
      over: all.filter((r) => below(r, rect)),
      beside: all.filter((r) => !below(rect, r) && !below(r, rect)),
    };
  };
  let [parentsOff, parentOffset, childrenOff, childOffset] = [0, 0, 0, 0];
  for (const id of [...neighbours.keys()].sort()) {
    const { rect, under, beside } = around(id);
    if (under.length >= 2 && beside.length === 0) {
      const mid = (Math.min(...under.map((r) => r.x)) + Math.max(...under.map((r) => r.x + r.w))) / 2;
      const off = Math.abs(cx(rect) - mid);
      if (off > CENTRED) [parentsOff, parentOffset] = [parentsOff + 1, parentOffset + off];
    }
    const [child] = under;
    const childId = [...(neighbours.get(id) ?? [])].find((n) => rects.get(n) === child);
    if (under.length !== 1 || child === undefined || childId === undefined || around(childId).over.length !== 1)
      continue;
    const off = Math.abs(cx(rect) - cx(child));
    if (off > TOLERANCE / 2) [childrenOff, childOffset] = [childrenOff + 1, childOffset + off];
  }
  return { parentsOff, parentOffset, childrenOff, childOffset };
}
