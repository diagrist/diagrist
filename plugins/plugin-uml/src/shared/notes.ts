import { type Point, type Rect, STANDARD_FONTS, textWidth } from '@diagrist/core';
import type { EdgeLabel, GridLayout, Route } from '@diagrist/layout-grid';

/** A dashed note above an element, with a tip down to it: left foot, tip, right foot. */
export interface NoteArt {
  readonly text: string;
  readonly rect: Rect;
  readonly at: { readonly x: number; readonly y: number };
  readonly tail: readonly Point[];
  /** Id of the element the note is on. */
  readonly on: string;
}

/** A note on one element, as the kinds read it. */
export interface NoteSource {
  readonly text: string;
  readonly on?: string;
}

const F = STANDARD_FONTS.note;
/** Measures after the note font (10 px: pad 10, height 26, lift 22, tip base 14). */
const PAD = F.size;
const HEIGHT = Math.round(2.6 * F.size);
const LIFT = Math.round(2.2 * F.size);
const BASE = Math.round(1.4 * F.size);

const overlaps = (a: Rect, b: Rect, pad: number) =>
  a.x < b.x + b.w + pad && a.x + a.w > b.x - pad && a.y < b.y + b.h + pad && a.y + a.h > b.y - pad;

const hits = (p: Point, q: Point, r: Rect, pad: number) =>
  Math.min(p[0], q[0]) < r.x + r.w + pad &&
  Math.max(p[0], q[0]) > r.x - pad &&
  Math.min(p[1], q[1]) < r.y + r.h + pad &&
  Math.max(p[1], q[1]) > r.y - pad;

/** A note above the element, or below it with the tip up. */
function placed(n: Rect, w: number, above: boolean): Pick<NoteArt, 'rect' | 'tail'> {
  const right = n.x + n.w;
  const rect = { x: right - BASE * 2, y: above ? n.y - LIFT - HEIGHT : n.y + n.h + LIFT, w, h: HEIGHT };
  const foot = rect.x + BASE;
  const edge = above ? rect.y + HEIGHT : rect.y;
  const tip = above ? n.y : n.y + n.h;
  return {
    rect,
    tail: [
      [foot - BASE / 2, edge],
      [right - BASE * 3, tip],
      [foot + BASE / 2, edge],
    ],
  };
}

/**
 * Notes stand above their element, their left edge a little left of its right edge; where elements, labels or lines
 * take that place and the place below is free, below it.
 */
export function noteArts(
  notes: readonly NoteSource[],
  grid: GridLayout,
  routes: readonly Route[],
  labels: readonly EdgeLabel[],
): NoteArt[] {
  const blocked = (r: Rect) =>
    grid.nodes.some((n) => overlaps(r, n.rect, 4)) ||
    labels.some((t) => overlaps(r, t.box, 4)) ||
    routes.some((x) => x.points.slice(1).some((q, i) => hits(x.points[i] ?? q, q, r, 4)));
  return notes.flatMap((note): NoteArt[] => {
    const n = note.on === undefined ? undefined : grid.nodes.find((x) => x.id === note.on)?.rect;
    if (!n || note.on === undefined) return [];
    const w = textWidth(note.text, F) + 2 * PAD;
    const above = placed(n, w, true);
    const below = placed(n, w, false);
    const place = blocked(above.rect) && !blocked(below.rect) ? below : above;
    const at = { x: place.rect.x + PAD, y: place.rect.y + HEIGHT / 2 + F.size / 2 - 1 };
    return [{ text: note.text, ...place, at, on: note.on }];
  });
}
