import { type Point, type Rect, textWidth } from '@diagrist/core';
import { type EdgeLabel, pointAlong, polylineLength, WRAP_EM, wrapWithin } from '@diagrist/layout-grid';
import type { Look } from '../../looks/look.js';
import type { StarRoom } from '../spacing.js';
import { CHIP_DROP, CHIP_PAD, edgeWords, viaFont } from '../via.js';
import { lineMeets, meets } from './geometry.js';
import type { StarLine } from './lines.js';

/** How far texts keep from boxes and, at `spacing=normal`, from other texts. */
const ROOM = { box: 6, text: 14 } as const;
/**
 * How far a text keeps from lines it does not belong to at `spacing=normal`: far enough to be read as its own line's
 * first, close where nothing else is free.
 */
const LINE_ROOM = [44, 30, 20, 12, 4];
/** What a text at the hub costs that stands against the turn of the others, in steps of `LINE_ROOM`. */
const OTHER_SIDE = 2;
/** Where along a line between neighbours a text is tried, in shares of the line, best first. */
const ALONG = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82];
/**
 * Where along a line at the hub a text is tried, in shares of the line from the hub, best first: further out, where
 * the lines round the hub stand further apart.
 */
const OUTWARD = [0.6, 0.68, 0.52, 0.76, 0.44, 0.84, 0.36, 0.28];

/** What texts keep out of: rectangles of boxes, frames and signs, and the lines with the index of their route. */
export interface Obstacles {
  readonly boxes: readonly Rect[];
  /** Frames, which a text may stand in wholly or outside of, but not across their line. */
  readonly frames: readonly Rect[];
  readonly lines: readonly (readonly Point[])[];
}

/**
 * The lines of an edge's text as its form of protocols writes them: its name wrapped, then its detail in the detail's
 * font, a chip with its pad on both sides and `CHIP_DROP` lower, clear of the sentence above it; its box reaches up
 * over the drop, so the block stays one.
 */
function textLines(line: StarLine, look: Look): { text: string; part: 'name' | 'detail'; w: number; drop: number }[] {
  const font = look.fonts.label;
  const wrapAt = (look.metrics.labelWrap ?? WRAP_EM) * font.size;
  const { name, detail } = edgeWords(line.edge, look.options.via);
  const measure = (s: string) => textWidth(s, font);
  const chip = look.options.via === 'chip';
  const names = name ? wrapWithin(name, wrapAt, measure) : [];
  const w = detail ? textWidth(detail, viaFont(look)) + (chip ? 2 * CHIP_PAD : 0) : 0;
  return [
    ...names.map((text) => ({ text, part: 'name' as const, w: measure(text), drop: 0 })),
    ...(detail ? [{ text: detail, part: 'detail' as const, w, drop: chip && names.length > 0 ? CHIP_DROP : 0 }] : []),
  ];
}

/** Whether a rectangle crosses the line of a frame or comes close to it, from inside or outside. */
const across = (r: Rect, f: Rect): boolean =>
  meets(r, f, ROOM.box) &&
  !(
    r.x >= f.x + ROOM.box &&
    r.y >= f.y + ROOM.box &&
    r.x + r.w <= f.x + f.w - ROOM.box &&
    r.y + r.h <= f.y + f.h - ROOM.box
  );

/**
 * The middles a block of `w` by `h` may take at a line: beside it on the sides `sides`, else on it. At a line of the
 * hub every spot on the first side comes before any on the second, so the texts of the hub keep one turn.
 */
function middles(
  points: readonly Point[],
  w: number,
  h: number,
  sides: readonly number[],
  onLine: boolean,
  beside: number,
  fromHub: boolean | undefined,
): Point[] {
  const length = polylineLength(points);
  const shares = fromHub === undefined ? ALONG : OUTWARD.map((t) => (fromHub ? t : 1 - t));
  const at = shares.map((t) => pointAlong(points, length * t));
  const besideAt = ({ p, dir }: (typeof at)[number], s: number): Point => {
    const n: Point = [dir[1], -dir[0]];
    const reach = beside + (Math.abs(n[0]) * w) / 2 + (Math.abs(n[1]) * h) / 2;
    return [p[0] + n[0] * reach * s, p[1] + n[1] * reach * s];
  };
  if (fromHub !== undefined && !onLine) return sides.flatMap((s) => at.map((a) => besideAt(a, s)));
  return at.flatMap((a) => {
    const out = sides.map((s) => besideAt(a, s));
    return onLine ? [a.p, ...out] : [...out, a.p];
  });
}

/**
 * The sides of its line a text may stand on: one beside a pair keeps outside; one at the hub stands first on the side
 * the ring turns to, so each gap between two lines of the hub holds the text of one; else the upper or left one first.
 */
function sidesOf(line: StarLine, turn: 1 | -1): number[] {
  if (line.side !== 0) return [line.side];
  if (line.fromHub !== undefined) {
    const s = line.fromHub ? turn : -turn;
    return [s, -s];
  }
  const { dir } = pointAlong(line.points, polylineLength(line.points) / 2);
  const n: Point = [dir[1], -dir[0]];
  const up = Math.abs(n[1]) > 0.3 ? n[1] < 0 : n[0] < 0;
  return up ? [1, -1] : [-1, 1];
}

/**
 * The texts of every line, each block at the first spot along its line, from the middle outwards, that meets no box,
 * no frame line, no other line and no text before it; texts stand beside their line, or on it where the look says so
 * and where a pair leaves no room; `strain` adds up how much closer than wished texts came to other lines.
 * Undefined when a text finds no spot.
 */
export function placeTexts(
  lines: readonly StarLine[],
  look: Look,
  routeOf: ReadonlyMap<number, number>,
  around: Obstacles,
  spacing: StarRoom,
  turn: 1 | -1,
): { labels: EdgeLabel[]; strain: number } | undefined {
  const size = look.fonts.label.size;
  const lineH = look.metrics.labelLineH;
  const taken: Rect[] = [];
  const beside = spacing.label;
  const lineRoom = LINE_ROOM.map((r) => r * spacing.factor);
  const out: EdgeLabel[] = [];
  let strain = 0;
  for (const [i, line] of lines.entries()) {
    const texts = textLines(line, look);
    if (texts.length === 0) continue;
    const w = Math.max(...texts.map((t) => t.w));
    const drop = texts.reduce((sum, t) => sum + t.drop, 0);
    const h = texts.length * lineH + (size - lineH) + 2 + drop;
    const onLine = look.options.edgeText.place === 'onLine' && line.side === 0;
    const own = line.points;
    const fits = (r: Rect, room: number) =>
      !around.boxes.some((b) => meets(r, b, ROOM.box)) &&
      !around.frames.some((f) => across(r, f)) &&
      !taken.some((t) => meets(r, t, ROOM.text * spacing.factor)) &&
      !around.lines.some((l, k) => k !== i && lineMeets(l, r, room));
    const spots = middles(own, w, h, sidesOf(line, turn), onLine, beside, line.fromHub).map(
      ([x, y]): Rect => ({ x: x - w / 2, y: y - h / 2, w, h }),
    );
    const ok = (r: Rect, room: number) => fits(r, room) && (onLine || !lineMeets(own, r, 1));
    const sides = line.fromHub !== undefined && !onLine && line.side === 0 ? 2 : 1;
    const per = spots.length / sides;
    const best = Array.from({ length: sides }, (_, k) => {
      const part = spots.slice(k * per, (k + 1) * per);
      const level = lineRoom.findIndex((room) => part.some((r) => ok(r, room)));
      const room = lineRoom[level];
      const spot = room === undefined ? undefined : part.find((r) => ok(r, room));
      return spot ? { spot, cost: level + k * OTHER_SIDE } : undefined;
    }).reduce((a, b) => (b && (!a || b.cost < a.cost) ? b : a), undefined);
    if (!best) return undefined;
    const { spot } = best;
    strain += best.cost;
    taken.push(spot);
    const route = routeOf.get(line.edge.index) ?? i;
    texts.forEach((t, k) => {
      const y = spot.y + size + k * lineH + texts.slice(0, k + 1).reduce((sum, u) => sum + u.drop, 0);
      const x = spot.x + w / 2;
      out.push({
        text: t.text,
        x,
        y,
        anchor: 'middle',
        box: { x: x - t.w / 2, y: y - size - t.drop, w: t.w, h: size + 2 + t.drop },
        route,
        part: t.part,
      });
    });
  }
  return { labels: out, strain };
}
