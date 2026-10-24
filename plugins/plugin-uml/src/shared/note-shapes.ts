import type { Shape } from '@diagrist/core';
import type { NoteArt } from './notes.js';

/** The folded corner of a note card. */
const FOLD = 8;

/**
 * Notes: dashed boxes with a tip down to their element; in the card look white cards with a folded corner, joined by
 * a dashed line from the middle of the tip's foot.
 */
export function noteShapes(notes: readonly NoteArt[], cards: boolean): Shape[] {
  return notes.map((note): Shape => {
    const { x, y, w, h } = note.rect;
    const text: Shape = {
      kind: 'text',
      ...note.at,
      text: note.text,
      role: cards ? 'plainLabel' : 'noteText',
      font: cards ? 'label' : 'note',
      anchor: 'start',
    };
    if (!cards) {
      const d = note.tail.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px} ${py}`).join(' ');
      return {
        kind: 'group',
        children: [{ kind: 'rect', ...note.rect, rx: 2, role: 'noteBox' }, { kind: 'path', d, role: 'noteTail' }, text],
      };
    }
    const corner = x + w - FOLD;
    const [left = [0, 0], tip = [0, 0], right = [0, 0]] = note.tail;
    return {
      kind: 'group',
      children: [
        { kind: 'line', x1: (left[0] + right[0]) / 2, y1: left[1], x2: tip[0], y2: tip[1], role: 'noteTail' },
        {
          kind: 'path',
          d: `M${x} ${y} L${corner} ${y} L${x + w} ${y + FOLD} L${x + w} ${y + h} L${x} ${y + h} Z`,
          role: 'cardBox',
        },
        { kind: 'path', d: `M${corner} ${y} L${corner} ${y + FOLD} L${x + w} ${y + FOLD}`, role: 'cardBox' },
        text,
      ],
    };
  });
}
