import type { Rect } from '@diagrist/core';
import { type NoteGeometry, noteGeometry } from '@diagrist/parts';
import type { LookFont } from '../looks/look.js';
import type { Note } from '../model/types.js';

/** A dashed note above a node, with its text and a tip down to the node. */
export interface NoteArt extends NoteGeometry {
  readonly text: string;
}

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
    return [{ text: note.text, ...noteGeometry(n, note.text, font, { clear: crest(note.on) }) }];
  });
}
