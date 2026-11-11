import type { Shape } from '@diagrist/core';
import type { NoteArt, RemarkLine } from '../layout/notes.js';

const BOX_RX = 2;

/** Each note: dashed box on the canvas, dashed tip to its node, text, in its tone where it has one. */
export function noteShapes(notes: readonly NoteArt[]): Shape[] {
  return notes.map((n): Shape => {
    const tone = n.tone ? `-${n.tone}` : '';
    return {
      kind: 'group',
      children: [
        { kind: 'rect', ...n.rect, rx: BOX_RX, role: `noteBox${tone}` },
        {
          kind: 'path',
          d: n.tail.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' '),
          role: `noteTail${tone}`,
        },
        { kind: 'text', ...n.at, text: n.text, role: `noteText${tone}`, font: 'note' },
      ],
    };
  });
}

/** The remarks below the picture, line by line, in the tone of their note. */
export const remarkShapes = (lines: readonly RemarkLine[]): Shape[] =>
  lines.map(
    (l): Shape => ({
      kind: 'text',
      x: l.x,
      y: l.y,
      text: l.text,
      role: l.tone ? `noteText-${l.tone}` : 'remark',
      font: 'note',
    }),
  );
