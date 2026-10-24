import type { Shape } from '@diagrist/core';
import type { LayerArt } from '../layout/layers.js';
import type { NoteArt } from '../layout/notes.js';

const BOX_RX = 2;

/** Each layer in its group `layer-<row>`: bracket for the first, box, leader with arrow, text. */
export function layerShapes(layers: readonly LayerArt[]): Shape[] {
  return layers.map(
    (l): Shape => ({
      kind: 'group',
      id: `layer-${l.row}`,
      children: [
        ...(l.spine ? [{ kind: 'line', ...l.spine, role: 'layerLine' } as const] : []),
        ...(l.attachment ? [{ kind: 'line', ...l.attachment, role: 'layerLine' } as const] : []),
        { kind: 'rect', ...l.rect, rx: BOX_RX, role: 'layerBox' },
        { kind: 'line', ...l.leader, role: 'layerLine' },
        { kind: 'path', d: l.arrow, role: 'layerArrow' },
        { kind: 'text', ...l.text, text: l.label, role: 'layerText', font: 'note', anchor: 'middle' },
      ],
    }),
  );
}

/** Each note: dashed box on the canvas, dashed tip to its node, text. */
export function noteShapes(notes: readonly NoteArt[]): Shape[] {
  return notes.map(
    (n): Shape => ({
      kind: 'group',
      children: [
        { kind: 'rect', ...n.rect, rx: BOX_RX, role: 'noteBox' },
        { kind: 'path', d: n.tail.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' '), role: 'noteTail' },
        { kind: 'text', ...n.text, text: n.content, role: 'noteText', font: 'note' },
      ],
    }),
  );
}
