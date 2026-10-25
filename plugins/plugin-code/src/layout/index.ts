import { type Point, type Rect, textWidth } from '@diagrist/core';
import { MARGIN } from '@diagrist/parts';
import type { CodeModel, Link } from '../model.js';
import { FONTS } from '../styles.js';
import { CARD, cardWidth, NOTE, type PlacedCard, placeCard } from './card.js';

/** A link as drawn: from the right edge of its line, out to its lane, along it and into the head of the other card. */
export interface PlacedLink {
  readonly link: Link;
  readonly index: number;
  readonly points: readonly Point[];
  readonly label?: { readonly text: string; readonly x: number; readonly y: number; readonly rect: Rect };
}

/** A laid out code diagram. */
export interface CodeLayout {
  readonly cards: readonly PlacedCard[];
  readonly links: readonly PlacedLink[];
  readonly width: number;
  readonly height: number;
}

/** Room between the stacked cards with their notes, and around the lanes of the links. */
const GAP = { cards: 40, label: 8, lane: 14, lanes: 20 } as const;

/** Where the first card starts below the kicker header, with and without a subtitle. */
const TOP = { subtitle: 92, title: 76 } as const;

/**
 * Cards stand one below the other in source order, all as wide as the widest, so their right edges form one line
 * the links leave from; each card's notes stand below it. The badges of marks sit in the left margin, which is only
 * there when a card has marks. Links run in lanes right of the cards, a longer one outside a shorter one, with
 * their label above the stretch that leaves the card, so a label never crosses a lane.
 */
export function layoutCode(
  model: CodeModel,
  header: { readonly width: number; readonly subtitle: boolean },
): CodeLayout {
  const marked = model.cards.some((card) => card.marks.length > 0);
  const x = MARGIN + (marked ? NOTE.margin + NOTE.badge + 4 : 0);
  const w = Math.max(0, ...model.cards.map(cardWidth));
  const cards: PlacedCard[] = [];
  let y = header.subtitle ? TOP.subtitle : TOP.title;
  for (const card of model.cards) {
    const placed = placeCard(card, x, y, w);
    cards.push(placed);
    y = placed.bottom + GAP.cards;
  }
  const links = placeLinks(model.links, cards, x + w);
  const lanes = links.map((link) => link.points[1]?.[0] ?? 0);
  const right = Math.max(x + w, header.width, ...lanes);
  return { cards, links, width: Math.ceil(right + MARGIN), height: Math.ceil(y - GAP.cards + MARGIN) };
}

function placeLinks(links: readonly Link[], cards: readonly PlacedCard[], edge: number): PlacedLink[] {
  const ends = links.flatMap((link, index) => {
    const from = cards.find((c) => c.card.id === link.from);
    const to = cards.find((c) => c.card.id === link.to);
    const row = from?.rows.find((r) => r.line.number === link.line);
    if (from === undefined || to === undefined || row === undefined || from === to) return [];
    return [{ link, index, start: row.top + CARD.line / 2, end: to.rect.y + CARD.head / 2 }];
  });
  const labelRoom = Math.max(0, ...ends.map(({ link }) => (link.label ? textWidth(link.label, FONTS.label) : 0)));
  const first = edge + GAP.label + labelRoom + GAP.lanes;
  const lanes = laneOf(ends);
  return ends.map(({ link, index, start, end }) => {
    const lane = first + (lanes.get(index) ?? 0) * GAP.lane;
    const points: Point[] = [
      [edge, start],
      [lane, start],
      [lane, end],
      [edge, end],
    ];
    if (!link.label) return { link, index, points };
    const labelW = textWidth(link.label, FONTS.label);
    const lx = edge + GAP.label;
    const ly = start - 5;
    const rect = { x: lx, y: ly - FONTS.label.size, w: labelW, h: FONTS.label.size + 3 };
    return { link, index, points, label: { text: link.label, x: lx, y: ly, rect } };
  });
}

/**
 * The lane of each link, counted from the cards outwards: the shortest links first, each in the innermost lane whose
 * links span other heights, so links one below the other share a lane and a longer link runs outside a shorter one.
 */
function laneOf(ends: readonly { index: number; start: number; end: number }[]): Map<number, number> {
  const span = (e: { start: number; end: number }) => [Math.min(e.start, e.end), Math.max(e.start, e.end)] as const;
  const byLength = [...ends].sort((a, b) => Math.abs(a.end - a.start) - Math.abs(b.end - b.start) || a.index - b.index);
  const taken: (readonly (readonly [number, number])[])[] = [];
  const lanes = new Map<number, number>();
  for (const e of byLength) {
    const [top, bottom] = span(e);
    const free = taken.findIndex((spans) => spans.every(([t, b]) => bottom + GAP.lane < t || top - GAP.lane > b));
    const lane = free < 0 ? taken.length : free;
    taken[lane] = [...(taken[lane] ?? []), [top, bottom]];
    lanes.set(e.index, lane);
  }
  return lanes;
}
