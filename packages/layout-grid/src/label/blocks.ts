import { type Point, textWidth } from '@diagrist/core';
import type { GridMetrics } from '../spec.js';
import { labelLine, partFont } from './text.js';
import type { EdgeLabel, EdgeText } from './types.js';
import { WRAP_EM, wrapTwo, wrapWithin } from './wrap.js';

/** A line of an edge's texts before it is placed. */
export interface Line {
  readonly text: string;
  readonly part: EdgeLabel['part'];
}

/** Names longer than this wrap beside a vertical piece, as `routeTexts` wraps them. */
const UPRIGHT = 14;

/** The widest a line of an edge's text may run, `labelWrap` or else `WRAP_EM` sizes of the label font. */
export const wrapWidth = (m: GridMetrics): number => (m.labelWrap ?? WRAP_EM) * m.labelFont.size;

const lineOf =
  (part: Line['part']) =>
  (text: string): Line => ({ text, part });

/**
 * The ways the texts of an edge stack: the name on one line, then wrapped in two, each with the detail below, beside
 * an upright piece a long name wrapped first. No line runs wider than `wrapWidth` where words allow: a longer name
 * or detail wraps word by word.
 */
export function stacks(text: EdgeText, upright: boolean, m: GridMetrics): Line[][] {
  const { name, detail } = text;
  const max = wrapWidth(m);
  const fits = (lines: readonly string[], part: Line['part']) =>
    lines.every((l) => textWidth(l, partFont(part, m)) <= max || !l.includes(' '));
  const within = (s: string, part: Line['part']) => wrapWithin(s, max, (t) => textWidth(t, partFont(part, m)));
  const tail: Line[] = !detail
    ? []
    : (fits([detail], 'detail') ? [detail] : within(detail, 'detail')).map(lineOf('detail'));
  if (!name) return tail.length > 0 ? [tail] : [];
  const two = wrapTwo(name, (l) => textWidth(l, partFont('name', m)) <= max);
  const ways = [[name], two, within(name, 'name')].filter((w, i) => fits(w, 'name') || i === 2);
  const unique = ways.filter((w, i) => ways.findIndex((v) => v.join('\n') === w.join('\n')) === i);
  const [first, second] = unique.map((w) => [...w.map(lineOf('name')), ...tail]);
  if (!first) return [];
  if (!second) return [first];
  return upright && name.length > UPRIGHT && first.length < second.length ? [second, first] : [first, second];
}

/** The width of the widest line of a stack. */
export const widthOf = (lines: readonly Line[], m: GridMetrics): number =>
  Math.max(0, ...lines.map((l) => textWidth(l.text, partFont(l.part, m))));

/** Where a stack stands: beside a piece, on it, or split with the name above and the detail below. */
export type Place = 'above' | 'below' | 'left' | 'right' | 'on' | 'split';

/**
 * The lines of a stack placed at `at` on a piece, each box reaching down to the next line so the stack reads as one
 * block: above or below a horizontal piece `labelGap` from it, left or right
 * of a vertical one, centred on the piece, or the name above and the rest below.
 */
export function placeStack(
  lines: readonly Line[],
  at: Point,
  place: Place,
  route: number,
  m: GridMetrics,
): EdgeLabel[] {
  const size = m.labelFont.size;
  const step = m.labelLineH;
  const n = lines.length;
  const put = (ls: readonly Line[], x: number, first: number, anchor: EdgeLabel['anchor']) =>
    ls.map((l, i) => {
      const line = labelLine(l.text, { x, y: first + i * step, anchor }, route, l.part, m);
      return i < ls.length - 1 ? { ...line, box: { ...line.box, h: Math.max(line.box.h, step) } } : line;
    });
  const [x, y] = at;
  const above = (ls: readonly Line[]) => put(ls, x, y - m.labelGap - (ls.length - 1) * step, 'middle');
  const below = (ls: readonly Line[]) => put(ls, x, y + m.labelGap + size - 2, 'middle');
  switch (place) {
    case 'above':
      return above(lines);
    case 'below':
      return below(lines);
    case 'split': {
      const names = lines.filter((l) => l.part === 'name');
      return [...above(names), ...below(lines.filter((l) => l.part !== 'name'))];
    }
    case 'on': {
      const lift = Math.round(size * 0.36);
      return put(lines, x, y - ((n - 1) * step) / 2 + lift, 'middle');
    }
    default: {
      const first = y - ((n - 1) * step + size + 2) / 2 + size;
      return place === 'left' ? put(lines, x - m.labelGap, first, 'end') : put(lines, x + m.labelGap, first, 'start');
    }
  }
}
