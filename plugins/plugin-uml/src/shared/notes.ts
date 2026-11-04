import { type Point, type Rect, STANDARD_FONTS } from '@diagrist/core';
import { type EdgeLabel, type GridLayout, overlaps, type Route } from '@diagrist/layout-grid';
import { type NoteGeometry, noteGeometry } from '@diagrist/parts';

/** A dashed note above an element, with a tip down to it, measured in the note font. */
export interface NoteArt extends NoteGeometry {
  readonly text: string;
  /** Id of the element the note is on. */
  readonly on: string;
}

/** A note on one element, as the kinds read it. */
export interface NoteSource {
  readonly text: string;
  readonly on?: string;
}

const F = STANDARD_FONTS.note;

const hits = (p: Point, q: Point, r: Rect, pad: number) =>
  Math.min(p[0], q[0]) < r.x + r.w + pad &&
  Math.max(p[0], q[0]) > r.x - pad &&
  Math.min(p[1], q[1]) < r.y + r.h + pad &&
  Math.max(p[1], q[1]) > r.y - pad;

/** Step by which a note slides left along the top of its element, when `slide` lets it. */
const SLIDE = 8;

/**
 * Notes stand above their element, their left edge a little left of its right edge; where elements, labels or lines
 * take that place and the place below is free, below it. With `slide`, a note blocked in both places slides left
 * along the top of its element, its tip still on it, to the first place with room around it.
 */
export function noteArts(
  notes: readonly NoteSource[],
  grid: GridLayout,
  routes: readonly Route[],
  labels: readonly EdgeLabel[],
  slide = false,
): NoteArt[] {
  const blocked = (r: Rect, pad = 4) =>
    grid.nodes.some((n) => overlaps(r, n.rect, pad)) ||
    labels.some((t) => overlaps(r, t.box, pad)) ||
    routes.some((x) => x.points.slice(1).some((q, i) => hits(x.points[i] ?? q, q, r, pad)));
  return notes.flatMap((note): NoteArt[] => {
    const n = note.on === undefined ? undefined : grid.nodes.find((x) => x.id === note.on)?.rect;
    if (!n || note.on === undefined) return [];
    const above = noteGeometry(n, note.text, F);
    const below = noteGeometry(n, note.text, F, { below: true });
    const slid: NoteGeometry[] = [];
    if (slide && blocked(above.rect) && blocked(below.rect))
      for (let dx = SLIDE; dx <= n.w / 2; dx += SLIDE) slid.push(noteGeometry({ ...n, x: n.x - dx }, note.text, F));
    const free = slid.find((g) => !blocked(g.rect, SLIDE + 4));
    const place = free ?? (blocked(above.rect) && !blocked(below.rect) ? below : above);
    return [{ text: note.text, ...place, on: note.on }];
  });
}
