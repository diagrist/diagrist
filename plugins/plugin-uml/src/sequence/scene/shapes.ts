import type { Shape } from '@diagrist/core';
import { markShapes } from '@diagrist/parts';
import type { SeqMessageArt, SeqShape, SeqTextRole } from '../layout/types.js';

/** Role and font role of each text role of the layout. */
const TEXT: Record<SeqTextRole, { readonly role: string; readonly font: string }> = {
  name: { role: 'name', font: 'name' },
  stereo: { role: 'stereo', font: 'note' },
  message: { role: 'message', font: 'message' },
  messageEmph: { role: 'messageEmph', font: 'message' },
  tag: { role: 'tagText', font: 'tag' },
  guard: { role: 'guard', font: 'message' },
  note: { role: 'noteText', font: 'note' },
  number: { role: 'number', font: 'tag' },
  constraint: { role: 'constraint', font: 'message' },
};

/** A shape of the layout as a scene shape of the plain notation. */
export function shape(s: SeqShape): Shape {
  switch (s.kind) {
    case 'rect':
      return { kind: 'rect', ...s.rect, ...(s.rx ? { rx: s.rx } : {}), role: s.role };
    case 'path':
      return { kind: 'path', d: s.d, role: s.role };
    case 'line':
      return { kind: 'line', ...s.seg, role: s.role };
    case 'circle':
      return { kind: 'circle', cx: s.cx, cy: s.cy, r: s.r, role: s.role };
    case 'text':
      return { kind: 'text', ...s.at, text: s.text, ...TEXT[s.role], anchor: s.anchor };
    case 'mark':
      return { kind: 'group', children: markShapes(s.id, s.x, s.y) };
  }
}

const KIND = { sync: 'call', async: 'signal', reply: 'reply', create: 'create' } as const;

/** A message: its group `edge-<k>` holds the line first, then open ends and label (SVG contract). */
export function messageShape(art: SeqMessageArt, id: string): Shape {
  const role = `${KIND[art.kind]}${art.emph ? '-emph' : ''}`;
  const d = art.points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
  return { kind: 'group', id, children: [{ kind: 'path', d, role }, ...art.ends.map(shape), ...art.label.map(shape)] };
}
