import { DEFAULT_THRESHOLDS, type Point, type Rect, segmentMeetsRect } from '@diagrist/core';
import type { Route } from '../layout.js';
import { insideFrame } from './inside.js';
import { at, clearance, type Line, lineOf } from './line.js';
import { cheapest, type Occupancy } from './occupancy.js';
import type { EdgeLabel } from './types.js';

/** Places along the line where a text may stand, the middle first. */
const ALONG = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74];
/** Distance of an end text from the end of the line and across it. */
const END_BACK = 10;
const END_ASIDE = 6;
/** Steps back of an end text: near first, then further along the line, where lines have parted. */
const CLOSE = [0, 8, 16, 24, 32];
const FAR = [48, 64, 80, 104, 128, 160];

/** A text on a straight line, measured by its kind. */
export interface AlongText {
  readonly text: string;
  readonly width: number;
}

/**
 * The texts of one straight line, the route at index `route`: one beside its middle, one at each end, such as
 * multiplicities, and for an end the frame its text stays inside, where the line leaves a frame around that end.
 */
export interface AlongTexts {
  readonly route: number;
  readonly middle?: AlongText;
  readonly from?: AlongText;
  readonly to?: AlongText;
  readonly inside?: { readonly from?: Rect; readonly to?: Rect };
}

const round = (v: number) => Math.round(v * 10) / 10;

/** A line of text of font size `size` centred on `c`, with the box it covers. */
function textAt(t: AlongText, size: number, c: Point, route: number, part: EdgeLabel['part']): EdgeLabel {
  const box = { x: c[0] - t.width / 2, y: c[1] - size / 2 - 1, w: t.width, h: size + 2 };
  return { text: t.text, x: round(c[0]), y: round(c[1] + size * 0.36), anchor: 'middle', box, route, part };
}

/** What a text costs for every foreign line nearer than the line check allows: as much as a line through it. */
const NEAR_COST = 10;

/**
 * The cost of a box for the foreign lines that come nearer than `labelClear` of the line check, and for its own line
 * further than `labelNear`.
 */
const nearTo =
  (own: Line, foreign: readonly Line[]) =>
  (c: EdgeLabel): number =>
    NEAR_COST *
    (foreign.filter((l) => segmentMeetsRect(l.a, l.b, c.box, DEFAULT_THRESHOLDS.labelClear)).length +
      (segmentMeetsRect(own.a, own.b, c.box, DEFAULT_THRESHOLDS.labelNear) ? 0 : 1));

/** The first free candidate, else the one with the fewest conflicts; its box is taken. */
function first(candidates: readonly EdgeLabel[], room: Occupancy, extra: (c: EdgeLabel) => number): EdgeLabel[] {
  const pick = cheapest(candidates, (c) => c.box, room, extra);
  if (!pick) return [];
  room.take(pick.box);
  return [pick];
}

/** The text beside the middle, first above or left of the line, then further along it. */
function middleText(
  t: AlongText,
  l: Line,
  at0: { readonly route: number; readonly size: number; readonly gap: number },
  room: Occupancy,
  foreign: readonly Line[],
): EdgeLabel[] {
  const { route, size, gap } = at0;
  const off = clearance(l.n, t.width, size + 2, gap / 2);
  const candidates = [1, -1].flatMap((side) =>
    ALONG.map((k) => {
      const p = at(l, k);
      return textAt(t, size, [p[0] + l.n[0] * off * side, p[1] + l.n[1] * off * side], route, 'name');
    }),
  );
  return first(candidates, room, nearTo(l, foreign));
}

/** A text at an end, on the free side of the line, inside `frame` where one is given and it finds room there. */
function endText(
  t: AlongText,
  end: { readonly tip: Point; readonly dir: Point; readonly frame?: Rect },
  l: Line,
  route: number,
  size: number,
  room: Occupancy,
  others: readonly Line[],
  foreign: readonly Line[],
): EdgeLabel[] {
  const { tip, dir } = end;
  const near = nearTo(l, foreign);
  const back = END_BACK + clearance(dir, t.width, size + 2, 0);
  const aside = clearance(l.n, t.width, size + 2, END_ASIDE);
  const put = (along: number, across: number) =>
    textAt(
      t,
      size,
      [tip[0] + dir[0] * along + l.n[0] * across, tip[1] + dir[1] * along + l.n[1] * across],
      route,
      'mark',
    );
  const candidates = [CLOSE, FAR].flatMap((steps) =>
    [-1, 1].flatMap((side) => steps.map((more) => put(back + more, aside * side))),
  );
  const clear = (c: EdgeLabel) => near(c) === 0;
  const inner = end.frame
    ? insideFrame(candidates, end.frame, room, put, { back, aside }, l, others, clear)
    : undefined;
  if (inner) {
    room.take(inner.box);
    return [inner];
  }
  return first(candidates, room, near);
}

/**
 * Texts of straight lines, each at the first spot clear of what `room` holds and of lines `apart` from its own
 * (meeting it at no end, as the line check reads a bundle) by the clearance the line check asks, else the one with the fewest conflicts, and taken: the middle text beside the middle and then further along, first on the side of the normal (up, or left
 * of a steep line); an end text a little back from its end on the freer side, further back where lines part, and
 * inside the frame `inside` names for that end where it finds room there nearer to its own line than to any other.
 */
export function textsAlong(
  routes: readonly Route[],
  texts: readonly AlongTexts[],
  room: Occupancy,
  measure: { readonly size: number; readonly gap: number },
  apart: (a: number, b: number) => boolean,
): EdgeLabel[] {
  const lines = routes.map(lineOf);
  const { size, gap } = measure;
  return texts.flatMap((t) => {
    const l = lines[t.route];
    if (l === undefined) return [];
    const others = lines.filter((_, i) => i !== t.route);
    const foreign = lines.filter((_, i) => i !== t.route && apart(t.route, i));
    const middle = t.middle ? middleText(t.middle, l, { route: t.route, size, gap }, room, foreign) : [];
    const end = (text: AlongText, tip: Point, dir: Point, inside: Rect | undefined) =>
      endText(text, { tip, dir, ...frame(inside) }, l, t.route, size, room, others, foreign);
    const from = t.from ? end(t.from, l.a, l.d, t.inside?.from) : [];
    const to = t.to ? end(t.to, l.b, [-l.d[0], -l.d[1]], t.inside?.to) : [];
    return [...middle, ...from, ...to];
  });
}

const frame = (r: Rect | undefined) => (r === undefined ? {} : { frame: r });
