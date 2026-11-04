import type { Rect } from '@diagrist/core';
import { cx } from '../geometry.js';
import { lengthOf, segmentsOf, TOLERANCE, tenth } from './lines.js';
import { crossings, foreignPairs } from './pairs.js';
import type { LineInput } from './types.js';

/**
 * The soft measures of a picture's lines, so a change to a layout can show whether it made pictures better: what
 * the algorithms minimise, recorded per picture.
 */
export interface LineMetrics {
  readonly lines: number;
  /** Points where two lines outside a common bundle cross (Q1), however many lines there are. */
  readonly crossings: number;
  /** Bends of all lines together, and of the line with the most (Q3). */
  readonly bends: number;
  readonly maxBends: number;
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
}

/** Off-centre by more than this many pixels counts for Q11. */
const CENTRED = 4;

/** The soft measures of the lines of a picture (Q1, Q3, Q11 to Q14 of the layout plan). */
export function lineMetrics(input: LineInput): LineMetrics {
  const segments = input.routes.map(segmentsOf);
  const bends = segments.map((s) => Math.max(0, s.length - 1));
  const length = input.routes.reduce(
    (sum, r, i) => sum + (r.weight ?? 1) * (segments[i] ?? []).reduce((l, s) => l + lengthOf(s), 0),
    0,
  );
  const { parentsOff, parentOffset, childrenOff, childOffset } = centring(input);
  return {
    lines: input.routes.length,
    crossings: foreignPairs(input.routes).reduce((n, p) => n + crossings(p).length, 0),
    bends: bends.reduce((a, b) => a + b, 0),
    maxBends: Math.max(0, ...bends),
    length: tenth(length),
    parentsOff,
    parentOffset: tenth(parentOffset),
    childrenOff,
    childOffset: tenth(childOffset),
    width: tenth(input.width ?? extent(input, (r) => r.x + r.w, 0)),
    height: tenth(input.height ?? extent(input, (r) => r.y + r.h, 1)),
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

/** How far boxes stand from the middle of their neighbours below (Q11) and single children from their parent (Q12). */
function centring(input: LineInput) {
  const rects = new Map(input.nodes.filter((n) => n.owner === undefined).map((n) => [n.id, n.rect]));
  const neighbours = new Map<string, Set<string>>();
  for (const r of input.routes) {
    if (r.from === r.to || !rects.has(r.from) || !rects.has(r.to)) continue;
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
