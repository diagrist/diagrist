import type { Shape } from '@diagrist/core';
import type { NoteArt } from '../layout/notes.js';

const BOX_RX = 2;

/** Each note: dashed box on the canvas, dashed tip to its node, text. */
export function noteShapes(notes: readonly NoteArt[]): Shape[] {
  return notes.map(
    (n): Shape => ({
      kind: 'group',
      children: [
        { kind: 'rect', ...n.rect, rx: BOX_RX, role: 'noteBox' },
        { kind: 'path', d: n.tail.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' '), role: 'noteTail' },
        { kind: 'text', ...n.at, text: n.text, role: 'noteText', font: 'note' },
      ],
    }),
  );
}
