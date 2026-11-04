import { type AreaMark, areaMark, domId, lineArea } from '@diagrist/core';
import type { PlacedLink } from '../layout/index.js';
import type { CodeModel, Link } from '../model.js';

const cardArea = (model: CodeModel, id: string): string | undefined => model.cards.find((c) => c.id === id)?.area;

/** The area of a link: its own, else the coloured one of the card it leaves, else of the card it enters (ADR 0033). */
const linkArea = (model: CodeModel, link: Link): string | undefined =>
  lineArea(model.areas, link.area, cardArea(model, link.from), cardArea(model, link.to));

/**
 * The mark of a card's frame and title (ADR 0033). Only they take the area: the code, its bands and its notes keep
 * their colours in every paint, since the ink of a plain run of code is the ink of the title.
 */
export const cardMark = (model: CodeModel, id: string): AreaMark | undefined =>
  areaMark(model.areas, cardArea(model, id), 'body');

/** The marks of the links by DOM id: each link with its label as a line, `edge-<index>`. */
export function linkMarks(model: CodeModel, links: readonly PlacedLink[]): Map<string, AreaMark> {
  const out = new Map<string, AreaMark>();
  for (const { link, index } of links) {
    const mark = areaMark(model.areas, linkArea(model, link), 'line');
    if (mark !== undefined) out.set(domId.edge(index), mark);
  }
  return out;
}

/** The areas the picture paints something in, for its legend. */
export const usedAreas = (model: CodeModel): Set<string> =>
  new Set(
    [...model.cards.map((c) => c.area), ...model.links.map((l) => linkArea(model, l))].filter(
      (a): a is string => a !== undefined,
    ),
  );

/** The titles of the cards of each area, by the area's id, for the description. */
export function cardsByArea(model: CodeModel): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const card of model.cards) {
    if (card.area !== undefined) out.set(card.area, [...(out.get(card.area) ?? []), card.title]);
  }
  return out;
}
