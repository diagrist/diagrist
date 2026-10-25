import { type Point, type Rect, textWidth } from '@diagrist/core';
import type { LookFont } from '../looks/look.js';
import type { Note } from '../model/types.js';
import type { Spot } from './art.js';

/** A dashed note above a node, with a tip down to the node: left foot, tip, right foot. */
export interface NoteArt {
  readonly content: string;
  readonly rect: Rect;
  readonly text: Spot;
  readonly tail: readonly Point[];
}

/**
 * Notes stand above their node, their left edge a little left of its right edge; in the `card` family above the icon
 * circle on the top edge. Measures follow the note `font` (10 px: pad 10, height 26, lift 22, tip base 14).
 */
export function noteArts(
  notes: readonly Note[],
  nodes: ReadonlyMap<string, Rect>,
  crest: (id: string) => number,
  font: LookFont,
): NoteArt[] {
  const f = font.size;
  const pad = f;
  const height = Math.round(2.6 * f);
  const lift = Math.round(2.2 * f);
  const base = Math.round(1.4 * f);
  return notes.flatMap((note): NoteArt[] => {
    const n = note.on === undefined ? undefined : nodes.get(note.on);
    if (!n || note.on === undefined) return [];
    const w = textWidth(note.text, font) + 2 * pad;
    const top = n.y - crest(note.on);
    const right = n.x + n.w;
    const rect = { x: right - base * 2, y: top - lift - height, w, h: height };
    const foot = rect.x + base;
    const tail: Point[] = [
      [foot - base / 2, rect.y + height],
      [right - base * 3, n.y],
      [foot + base / 2, rect.y + height],
    ];
    const text = { x: rect.x + pad, y: rect.y + height / 2 + f / 2 - 1 };
    return [{ content: note.text, rect, text, tail }];
  });
}
