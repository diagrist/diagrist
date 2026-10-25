import { domId, type Shape } from '@diagrist/core';
import { CARD, NOTE, type PlacedCard } from '../layout/card.js';

/** A numbered badge: a small circle on paper with its number in it. */
function badge(x: number, y: number, n: number): Shape[] {
  return [
    { kind: 'circle', cx: x, cy: y, r: NOTE.badge, role: 'badge' },
    { kind: 'text', x, y: y + 3.4, text: String(n), role: 'badgeText', font: 'badge', anchor: 'middle' },
  ];
}

/**
 * One card in its group `node-<id>`: the sheet, the head with title and file, the bands of the marks with a dark edge,
 * the line numbers and the code with its runs, then the badges in the margin and the notes below.
 */
export function cardShapes(placed: PlacedCard): Shape {
  const { rect, card } = placed;
  const { x, y, w } = rect;
  const head = y + CARD.headBaseline;
  const children: Shape[] = [
    { kind: 'rect', ...rect, rx: 4, role: 'card' },
    { kind: 'text', x: x + CARD.padX, y: head, text: card.title, role: 'cardTitle', font: 'cardTitle' },
    {
      kind: 'text',
      x: x + w - CARD.padX,
      y: head,
      text: placed.meta,
      role: 'cardMeta',
      font: 'cardMeta',
      anchor: 'end',
    },
    { kind: 'line', x1: x, y1: y + CARD.head, x2: x + w, y2: y + CARD.head, role: 'cardRule' },
    ...placed.bands.flatMap((band): Shape[] => [
      { kind: 'rect', ...band.rect, role: 'band' },
      { kind: 'rect', ...band.rect, w: CARD.edge, role: 'bandEdge' },
    ]),
    ...placed.rows.flatMap(({ line, baseline }): Shape[] => [
      {
        kind: 'text',
        x: placed.numbersEnd,
        y: baseline,
        text: String(line.number),
        role: 'number',
        font: 'code',
        anchor: 'end',
      },
      ...(line.text === ''
        ? []
        : [
            {
              kind: 'text',
              x: placed.codeX,
              y: baseline,
              text: line.text,
              runs: line.runs,
              role: 'code',
              font: 'code',
            } as const,
          ]),
    ]),
    ...placed.bands.flatMap((band) => badge(band.badge.x, band.badge.y, band.mark.n)),
    ...placed.notes.flatMap((note): Shape[] => [
      ...badge(note.badge.x, note.badge.y, note.mark.n),
      ...note.lines.map(
        (text, i): Shape => ({
          kind: 'text',
          x: note.x,
          y: note.baselines[i] ?? 0,
          text,
          role: 'noteText',
          font: 'noteText',
        }),
      ),
    ]),
  ];
  return { kind: 'group', id: domId.node(card.id), children };
}
