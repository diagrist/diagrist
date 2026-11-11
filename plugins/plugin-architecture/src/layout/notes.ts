import type { Rect, Tone } from '@diagrist/core';
import { MARGIN, type NoteGeometry, noteGeometry, wrap } from '@diagrist/parts';
import type { LookFont } from '../looks/look.js';
import type { Note } from '../model/types.js';
import type { Spot } from './art-types.js';

/** A dashed note above a node, with its text, a tip down to the node, and its tone. */
export interface NoteArt extends NoteGeometry {
  readonly text: string;
  readonly tone?: Tone;
}

/** A line of a remark below the picture: a note without `on`, wrapped to the width of the picture. */
export interface RemarkLine extends Spot {
  readonly text: string;
  readonly tone?: Tone;
}

/** The remarks below the picture and the lower edge of the last line, `top` when there is none. */
export interface Remarks {
  readonly lines: readonly RemarkLine[];
  readonly bottom: number;
}

/** From the content to the first baseline and between baselines, in sizes of the font; room below the last. */
const REMARK = { gap: 1.6, line: 1.5, after: 0.5 } as const;

/**
 * Notes stand above their node, their left edge a little left of its right edge, measured in the note `font`; above
 * a node with a crest, such as the icon circle of a card, they stand above the crest.
 */
export function noteArts(
  notes: readonly Note[],
  nodes: ReadonlyMap<string, Rect>,
  crest: (id: string) => number,
  font: LookFont,
): NoteArt[] {
  return notes.flatMap((note): NoteArt[] => {
    const n = note.on === undefined ? undefined : nodes.get(note.on);
    if (!n || note.on === undefined) return [];
    const geometry = noteGeometry(n, note.text, font, { clear: crest(note.on) });
    return [{ text: note.text, ...geometry, ...(note.tone ? { tone: note.tone } : {}) }];
  });
}

/**
 * Notes without `on` as remarks below the content that ends at `top`: one after the other at the left margin in the
 * note `font`, each wrapped to a picture `width` wide.
 */
export function remarkArts(notes: readonly Note[], top: number, width: number, font: LookFont): Remarks {
  const f = font.size;
  const step = Math.round(REMARK.line * f);
  const texts = notes
    .filter((n) => n.on === undefined)
    .flatMap((n) => wrap(n.text, width - 2 * MARGIN, font).map((text) => ({ text, tone: n.tone })));
  const first = top + Math.round(REMARK.gap * f);
  const lines = texts.map(
    ({ text, tone }, i): RemarkLine => ({ x: MARGIN, y: first + i * step, text, ...(tone ? { tone } : {}) }),
  );
  const last = lines.at(-1);
  return { lines, bottom: last ? last.y + Math.round(REMARK.after * f) : top };
}
