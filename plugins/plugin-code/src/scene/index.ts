import { type Anchors, domId, markAreas, type Placed, type Scene, type Shape } from '@diagrist/core';
import { kickerShapes, withAreaLegend } from '@diagrist/parts';
import type { CodeLayout } from '../layout/index.js';
import type { CodeModel } from '../model.js';
import type { Header } from '../texts.js';
import { cardMark, linkMarks, usedAreas } from './areas.js';
import { cardShapes } from './card.js';

const path = (points: readonly (readonly [number, number])[]): string =>
  points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');

/**
 * The kicker header, the cards in source order, then the links in groups `edge-<index>` on top; below them a legend
 * of the areas when the picture has some (ADR 0033).
 */
export function codeScene(layout: CodeLayout, header: Header, model: CodeModel): Scene {
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
  const cards = layout.cards.map((placed) => cardShapes(placed, cardMark(model, placed.card.id)));
  const scene: Scene = {
    width: layout.width,
    height: layout.height,
    title: header.alt,
    areas: model.areas.paint,
    children: [...kickerShapes(header), ...cards, ...markAreas(links, linkMarks(model, layout.links))],
  };
  return withAreaLegend(scene, model.areas, usedAreas(model), 'card');
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
      span: link.span,
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
