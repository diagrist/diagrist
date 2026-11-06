import { DEFAULT_THRESHOLDS, type Point, type Rect, segmentMeetsRect } from '@diagrist/core';
import { overlaps } from '../geometry.js';
import type { Route } from '../layout.js';
import type { RailSide } from './rail-order.js';
import type { LayeredEdge } from './spec.js';

/**
 * Where the text of a rail stands: over the piece out of its upper end, under the piece out of its lower end, or
 * beside its track, where it needs room between the track and the next rail outside.
 */
export type RailTextAt = 'upper' | 'lower' | 'beside';

/**
 * Where a text tries next when the place it tried is not clear: the piece at the other end after the piece at the
 * end the line starts from, `first`, then beside the track.
 */
export const nextTextAt = (at: RailTextAt, first: RailTextAt): RailTextAt =>
  at !== first ? 'beside' : at === 'upper' ? 'lower' : 'upper';

/** How high the text of a line stands, one line of its size and two pixels per line of its label. */
export const textHeight = (e: LayeredEdge): number => (e.label?.lines?.length ?? 1) * ((e.label?.size ?? 0) + 2);

/** A rail as drawn, for the search of its text: its side, its track and the ends of its two end pieces. */
export interface RailPieces {
  readonly side: RailSide;
  readonly at: number;
  /** The end piece at the upper box: where it leaves the box and how high it runs. */
  readonly upper: { readonly x: number; readonly y: number };
  readonly lower: { readonly x: number; readonly y: number };
}

/** What a rail's text on a piece keeps clear of: boxes, the outlines of frames, lines and texts already set. */
export interface Clutter {
  readonly boxes: readonly Rect[];
  readonly frames: readonly Rect[];
  readonly lines: readonly Route[];
  readonly texts: readonly Rect[];
}

/** Does `inner`, grown by `pad`, lie within `outer`? */
const within = (inner: Rect, outer: Rect, pad: number) =>
  inner.x - pad >= outer.x &&
  inner.y - pad >= outer.y &&
  inner.x + inner.w + pad <= outer.x + outer.w &&
  inner.y + inner.h + pad <= outer.y + outer.h;

/** Does any piece of `route` come nearer to `box` than `pad`? */
const near = (route: Route, box: Rect, pad: number) =>
  route.points.slice(1).some((p, i) => segmentMeetsRect(route.points[i] as Point, p, box, pad));

/** Is `box` clear of the boxes, the outlines of frames and the texts by `pad`, and of the lines by the line check? */
function clear(box: Rect, clutter: Clutter, pad: number): boolean {
  if (clutter.boxes.some((r) => overlaps(r, box, pad))) return false;
  if (clutter.frames.some((r) => overlaps(r, box, pad) && !within(box, r, pad))) return false;
  if (clutter.texts.some((r) => overlaps(r, box, pad))) return false;
  return !clutter.lines.some((r) => near(r, box, DEFAULT_THRESHOLDS.labelClear));
}

/**
 * The text of a rail over its upper piece or under its lower one, `gap` off the piece and at least `gap` from the box
 * at its end and from the track: of the spots `gap` apart along the piece, the one nearest the box that stands clear
 * of every box, of the outline of every frame, of every other line by the clearance of the line check, and of the
 * texts set before; undefined where the piece is too short or no spot is clear.
 */
export function pieceText(
  e: LayeredEdge,
  rail: RailPieces,
  at: 'upper' | 'lower',
  gap: number,
  clutter: Clutter,
): Rect | undefined {
  const w = e.label?.width ?? 0;
  const h = textHeight(e);
  const end = rail[at];
  const left = rail.side === 'left';
  const room = Math.abs(rail.at - end.x) - 2 * gap - w;
  const y = at === 'upper' ? end.y - gap - h : end.y + gap;
  for (let off = 0; off <= room; off = off < room && off + gap > room ? room : off + gap) {
    const box = { x: left ? end.x - gap - w - off : end.x + gap + off, y, w, h };
    if (clear(box, clutter, gap / 2)) return box;
    if (off === room) break;
  }
  return undefined;
}

/** The text of a rail beside its track, outside it, centred between its ends. */
export function besideText(e: LayeredEdge, rail: RailPieces, gap: number): Rect {
  const [w, h] = [e.label?.width ?? 0, textHeight(e)];
  const y = (rail.upper.y + rail.lower.y) / 2 - h / 2;
  return { x: rail.side === 'left' ? rail.at - gap - w : rail.at + gap, y, w, h };
}
