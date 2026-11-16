import { type Point, type Rect, textWidth } from '@diagrist/core';
import { type EdgeLabel, pointAlong, polylineLength, WRAP_EM, wrapWithin } from '@diagrist/layout-grid';
import type { Look } from '../../looks/look.js';
import { CHIP_DROP, CHIP_PAD, edgeWords, viaFont } from '../via.js';
import { lineMeets, meets } from './geometry.js';
import type { StarLine } from './lines.js';

/** How far a text beside its line keeps from it. */
const BESIDE = 6;
/** How far texts keep from boxes and other texts. */
const ROOM = { box: 6, text: 6 } as const;
/**
 * How far a text keeps from lines it does not belong to: far enough to be read as its own line's first, close
 * where nothing else is free.
 */
const LINE_ROOM = [44, 30, 20, 12, 4];
/** Where along its line a text is tried, in shares of the line, best first. */
const ALONG = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82];

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

/** Whether a rectangle crosses the line of a frame, standing partly inside and partly outside it. */
const across = (r: Rect, f: Rect): boolean =>
  meets(r, f) && !(r.x >= f.x && r.y >= f.y && r.x + r.w <= f.x + f.w && r.y + r.h <= f.y + f.h);

/** The middles a block of `w` by `h` may take at a line: beside it on the sides `sides`, else on it. */
function middles(points: readonly Point[], w: number, h: number, sides: readonly number[], onLine: boolean): Point[] {
  const length = polylineLength(points);
  return ALONG.flatMap((t) => {
    const { p, dir } = pointAlong(points, length * t);
    const n: Point = [dir[1], -dir[0]];
    const reach = BESIDE + (Math.abs(n[0]) * w) / 2 + (Math.abs(n[1]) * h) / 2;
    const beside = sides.map((s): Point => [p[0] + n[0] * reach * s, p[1] + n[1] * reach * s]);
    return onLine ? [p, ...beside] : [...beside, p];
  });
}

/** The sides of its line a text may stand on, the upper one or the left one first; one beside a pair keeps outside. */
function sidesOf(line: StarLine): number[] {
  if (line.side !== 0) return [line.side];
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
): { labels: EdgeLabel[]; strain: number } | undefined {
  const size = look.fonts.label.size;
  const lineH = look.metrics.labelLineH;
  const taken: Rect[] = [];
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
      !taken.some((t) => meets(r, t, ROOM.text)) &&
      !around.lines.some((l, k) => k !== i && lineMeets(l, r, room));
    const spots = middles(own, w, h, sidesOf(line), onLine).map(
      ([x, y]): Rect => ({ x: x - w / 2, y: y - h / 2, w, h }),
    );
    const level = LINE_ROOM.findIndex((room) => spots.some((r) => fits(r, room) && (onLine || !lineMeets(own, r, 1))));
    const room = LINE_ROOM[level];
    const spot = room === undefined ? undefined : spots.find((r) => fits(r, room) && (onLine || !lineMeets(own, r, 1)));
    strain += level;
    if (!spot) return undefined;
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
