import { type Anchors, domId, type Placed, type Scene, type Shape } from '@diagrist/core';
import { kickerShapes } from '@diagrist/parts';
import type { CodeLayout } from '../layout/index.js';
import type { Header } from '../texts.js';
import { cardShapes } from './card.js';

const path = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

/** The kicker header, the cards in source order, then the links in groups `edge-<index>` on top. */
export function codeScene(layout: CodeLayout, header: Header): Scene {
  const links = layout.links.map(
    (link): Shape => ({
      kind: 'group',
      id: domId.edge(link.index),
      children: [
        { kind: 'path', d: path(link.points), role: 'link' },
        ...(link.label
          ? [
              {
                kind: 'text',
                x: link.label.x,
                y: link.label.y,
                text: link.label.text,
                role: 'linkLabel',
                font: 'label',
              } as const,
            ]
          : []),
      ],
    }),
  );
  return {
    width: layout.width,
    height: layout.height,
    title: header.alt,
    children: [...kickerShapes(header), ...layout.cards.map(cardShapes), ...links],
  };
}

/** Cards as nodes and links as edges, by the DOM ids of their groups. */
export function codeAnchors(layout: CodeLayout): Anchors {
  return {
    width: layout.width,
    height: layout.height,
    nodes: layout.cards.map(({ card, rect }) => ({ id: card.id, domId: domId.node(card.id), rect })),
    groups: [],
    edges: layout.links.map(({ link, index, points }) => ({
      index,
      from: link.from,
      to: link.to,
      domId: domId.edge(index),
      points,
    })),
  };
}

/** What the placement check sees: cards as boxes, notes and link labels as texts. */
export function codePlaced(layout: CodeLayout): Placed[] {
  return [
    ...layout.cards.flatMap(({ card, rect, notes }): Placed[] => [
      { key: card.id, kind: 'box', rect, span: card.span },
      ...notes.map(
        (note): Placed => ({
          key: `${card.id}.note-${note.mark.n}`,
          kind: 'text',
          rect: note.rect,
          span: note.mark.span,
        }),
      ),
    ]),
    ...layout.links.flatMap(({ link, index, label }): Placed[] =>
      label ? [{ key: `link-${index}.label`, kind: 'text', rect: label.rect, span: link.span }] : [],
    ),
  ];
}
