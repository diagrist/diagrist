import { type Point, type Rect, textWidth } from '@diagrist/core';
import { cheapest, type EdgeLabel, type GridLayout, type Occupancy } from '@diagrist/layout-grid';
import type { KnownRelation } from '../diagram.js';
import type { UseCaseModel } from '../model.js';
import { insideFrame } from './inside.js';
import { at, clearance, type Line } from './line.js';
import { UC_FONTS, UC_GRID } from './metrics.js';

/** Places along the line where a text may stand, the middle first. */
const ALONG = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74];
/** Distance of an end text from the end of the line and across it. */
const END_BACK = 10;
const END_ASIDE = 6;
/** Steps back of an end text: near first, then further along the line, where lines have parted. */
const NEAR = [0, 8, 16, 24, 32];
const FAR = [48, 64, 80, 104, 128, 160];

const FONT = UC_FONTS.label;
const round = (v: number) => Math.round(v * 10) / 10;

/** A label line centred on `c`, with the box it covers. */
export function textAt(text: string, c: Point, route: number, part: EdgeLabel['part']): EdgeLabel {
  const w = textWidth(text, FONT);
  const box = { x: c[0] - w / 2, y: c[1] - FONT.size / 2 - 1, w, h: FONT.size + 2 };
  return { text, x: round(c[0]), y: round(c[1] + FONT.size * 0.36), anchor: 'middle', box, route, part };
}

/** The first free candidate, else the one with the fewest conflicts; its box is taken. */
function first(candidates: readonly EdgeLabel[], room: Occupancy): EdgeLabel[] {
  const pick = cheapest(candidates, (c) => c.box, room);
  if (!pick) return [];
  room.take(pick.box);
  return [pick];
}

/** One relation with its line and the index of its route. */
export interface Drawn {
  readonly relation: KnownRelation;
  readonly line: Line;
  readonly route: number;
}

/** «include», «extend» and a name stand beside the middle, first above or right of the line. */
export function middleText(d: Drawn, room: Occupancy): EdgeLabel[] {
  const { kind, label } = d.relation;
  const text = [kind === 'include' || kind === 'extend' ? `«${kind}»` : '', label ?? ''].filter(Boolean).join(' ');
  if (!text) return [];
  const l = d.line;
  const off = clearance(l.n, textWidth(text, FONT), FONT.size + 2, UC_GRID.labelGap / 2);
  const candidates = [1, -1].flatMap((side) =>
    ALONG.map((t) => {
      const p = at(l, t);
      return textAt(text, [p[0] + l.n[0] * off * side, p[1] + l.n[1] * off * side], d.route, 'name');
    }),
  );
  return first(candidates, room);
}

/** The frame of an end when the line crosses it: that end lies inside a subject, the other one not in the same. */
function frameOf(id: string, other: string, m: UseCaseModel, layout: GridLayout): Rect | undefined {
  const s = m.cases.get(id)?.subject;
  return s !== undefined && m.cases.get(other)?.subject !== s ? layout.groups.find((g) => g.id === s)?.rect : undefined;
}

/** Multiplicities of an association at their end, on the free side of the line. */
export function endTexts(
  d: Drawn,
  room: Occupancy,
  m: UseCaseModel,
  layout: GridLayout,
  others: readonly Line[],
): EdgeLabel[] {
  const l = d.line;
  const { from, to } = d.relation;
  const ends: [string | undefined, Point, Point, Rect | undefined][] = [
    [d.relation.source, l.a, l.d, frameOf(from, to, m, layout)],
    [d.relation.card, l.b, [-l.d[0], -l.d[1]], frameOf(to, from, m, layout)],
  ];
  return ends.flatMap(([text, tip, dir, frame]) => {
    if (!text) return [];
    const w = textWidth(text, FONT);
    const back = END_BACK + clearance(dir, w, FONT.size + 2, 0);
    const aside = clearance(l.n, w, FONT.size + 2, END_ASIDE);
    const put = (along: number, across: number) =>
      textAt(
        text,
        [tip[0] + dir[0] * along + l.n[0] * across, tip[1] + dir[1] * along + l.n[1] * across],
        d.route,
        'mark',
      );
    const candidates = [NEAR, FAR].flatMap((steps) =>
      [-1, 1].flatMap((side) => steps.map((more) => put(back + more, aside * side))),
    );
    const inner = frame ? insideFrame(candidates, frame, room, put, { back, aside }, l, others) : undefined;
    if (inner) {
      room.take(inner.box);
      return [inner];
    }
    return first(candidates, room);
  });
}
