import type { Point, Rect } from '@diagrist/core';
import type { GridLayout, GridNode, GridSpec, Occupancy, PlacedNode } from '@diagrist/layout-grid';
import type { Note } from '../diagram.js';
import type { Comment } from './art.js';
import { placeComment } from './comment.js';
import { UC } from './metrics.js';

/** A box over the area of a subject counts like a node, so the note of a subject stays outside. */
const INSIDE = 100;

/** Words into lines of at most `width` characters; a longer word stands alone. */
export function wrapNote(text: string, width: number = UC.noteWrap): string[] {
  const out: string[] = [];
  for (const word of text.trim().split(/\s+/)) {
    const last = out.at(-1);
    if (last !== undefined && last.length + 1 + word.length <= width) out[out.length - 1] = `${last} ${word}`;
    else out.push(word);
  }
  return out;
}

const overlaps = (a: Rect, b: Rect, pad: number): boolean =>
  a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;

/** Where a ray from `o` inside the rectangle leaves it. */
function exitBox(o: Point, d: Point, r: Rect): Point {
  const along = (from: number, dir: number, lo: number, hi: number) =>
    dir > 0 ? (hi - from) / dir : dir < 0 ? (lo - from) / dir : Number.POSITIVE_INFINITY;
  const t = Math.max(0, Math.min(along(o[0], d[0], r.x, r.x + r.w), along(o[1], d[1], r.y, r.y + r.h)));
  return [o[0] + d[0] * t, o[1] + d[1] * t];
}

/**
 * The point on the outline of a node in direction `d`, `UC.endGap` outside: exactly on an ellipse; below a stick
 * figure under its role, so the link does not strike through the name. The same rule as the straight lines.
 */
function rim(p: PlacedNode, n: GridNode | undefined, d: Point): Point {
  const r = p.rect;
  const o: Point = [r.x + r.w / 2, r.y + r.h / 2];
  if (n?.shape === 'ellipse') {
    const t = 1 / Math.hypot(d[0] / (r.w / 2), d[1] / (r.h / 2));
    return [o[0] + d[0] * t, o[1] + d[1] * t];
  }
  let hit = exitBox(o, d, r);
  const c = n?.caption;
  const label = c && { x: o[0] - c.w / 2, y: r.y + r.h, w: c.w, h: c.below };
  if (label && d[1] > 0 && Math.abs(hit[1] - (r.y + r.h)) < 0.01 && hit[0] >= label.x && hit[0] <= label.x + label.w)
    hit = exitBox(hit, d, label);
  return [hit[0] + d[0] * UC.endGap, hit[1] + d[1] * UC.endGap];
}

/** Note on a subject: outside every frame, linked to the nearest point of its border; the search starts top right. */
function subjectNote(note: Note, frame: Rect, frames: readonly Rect[], room: Occupancy): Comment {
  const start = ([x, y]: Point): Point => [
    Math.min(frame.x + frame.w, Math.max(frame.x, x)),
    Math.min(frame.y + frame.h, Math.max(frame.y, y)),
  ];
  const penalty = (box: Rect) => INSIDE * frames.filter((f) => overlaps(box, f, 2)).length;
  const centre: Point = [frame.x + frame.w, frame.y];
  return placeComment(wrapNote(note.text), { centre, start, own: -1, ...on(note), penalty }, room);
}

const on = (note: Note) => (note.on === undefined ? {} : { on: note.on });

/**
 * A note on an actor or use case as a UML comment: a box at a free spot near the element, joined to its outline by
 * a dashed line. Inside a subject the box stays inside, at an actor outside; frame lines cost like foreign lines.
 * Beside an actor the column is narrow, so the note wraps earlier there.
 */
export function placeNote(
  note: Note,
  isActor: (id: string) => boolean,
  spec: GridSpec,
  layout: GridLayout,
  room: Occupancy,
): Comment | undefined {
  const node = layout.nodes.find((n) => n.id === note.on);
  if (!node) {
    const frame = layout.groups.find((g) => g.id === note.on)?.rect;
    return (
      frame &&
      subjectNote(
        note,
        frame,
        layout.groups.map((g) => g.rect),
        room,
      )
    );
  }
  const model = spec.nodes.find((n) => n.id === node.id);
  const centre: Point = [node.rect.x + node.rect.w / 2, node.rect.y + node.rect.h / 2];
  const start = (box: Point): Point => {
    const len = Math.hypot(box[0] - centre[0], box[1] - centre[1]) || 1;
    return rim(node, model, [(box[0] - centre[0]) / len, (box[1] - centre[1]) / len]);
  };
  const width = isActor(node.id) ? UC.wrap : UC.noteWrap;
  return placeComment(wrapNote(note.text, width), { centre, start, own: -1, ...on(note) }, room);
}
