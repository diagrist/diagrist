import { type Point, type Rect, textWidth } from '@diagrist/core';
import type { EdgeLabel } from '@diagrist/layout-grid';
import type { KnownRelation } from '../diagram.js';
import type { Comment } from './art.js';
import { UC, UC_FONTS } from './metrics.js';

const FONT = UC_FONTS.label;
/** Height of a line of a note. */
export const NOTE_LINE = FONT.size + 4;

/** `{voucher present}`: Diagrist sets the braces. */
export const conditionText = (when: string): string => `{${when}}`;

/** The lines of the note on an extend: condition and extension points; none without both. */
export function commentLines(r: KnownRelation): string[] {
  if (r.kind !== 'extend') return [];
  return [
    ...(r.when ? [`condition: ${conditionText(r.when)}`] : []),
    ...(r.at?.length ? [`extension point${r.at.length > 1 ? 's' : ''}: ${r.at.join(', ')}`] : []),
  ];
}

/** The point on the edge of the box towards `toward`, seen from its centre. */
export function border(r: Rect, toward: Point): Point {
  const c: Point = [r.x + r.w / 2, r.y + r.h / 2];
  const dx = toward[0] - c[0];
  const dy = toward[1] - c[1];
  const tx = dx ? r.w / 2 / Math.abs(dx) : Number.POSITIVE_INFINITY;
  const ty = dy ? r.h / 2 / Math.abs(dy) : Number.POSITIVE_INFINITY;
  const t = Math.min(1, tx, ty);
  return [c[0] + dx * t, c[1] + dy * t];
}

/** A note in box `rect` with its lines, linked from `start` to the nearest point of its border towards it. */
export function commentAt(
  rect: Rect,
  texts: readonly string[],
  start: Point,
  owner: { readonly on?: string; readonly route?: number },
): Comment {
  const lines = texts.map((text, i) => ({
    text,
    x: rect.x + UC.notePad,
    y: rect.y + UC.notePad + i * NOTE_LINE + FONT.size,
  }));
  return { ...owner, rect, link: [start, border(rect, start)], lines };
}

/** The lines of a comment as labels of its route, so the kernel checks them. */
export const commentLabels = (c: Comment): EdgeLabel[] =>
  c.route === undefined
    ? []
    : c.lines.map((t) => {
        const w = textWidth(t.text, FONT);
        return {
          ...t,
          anchor: 'start',
          box: { x: t.x, y: t.y - FONT.size, w, h: FONT.size + 2 },
          route: c.route ?? 0,
          part: 'detail',
        };
      });
