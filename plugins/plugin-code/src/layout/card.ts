import type { CodeLine } from '@diagrist/code';
import { type Rect, runsWidth, textWidth } from '@diagrist/core';
import { wrap } from '@diagrist/parts';
import type { Card, Mark } from '../model.js';
import { FONTS } from '../styles.js';

/** Measures of a card at the code size of 11 px, in pixels. */
export const CARD = {
  head: 32,
  headBaseline: 20,
  padX: 14,
  padY: 10,
  line: 18,
  baseline: 13,
  gutterGap: 16,
  headGap: 24,
  minWidth: 320,
  edge: 3,
} as const;

/** Measures of the numbers and notes around a card. */
export const NOTE = { badge: 8, margin: 16, gap: 18, line: 16, after: 8, indent: 24, baseline: 11 } as const;

/** A drawn line of a card: the code, where its row starts, and the baseline of its text. */
export interface Row {
  readonly line: CodeLine;
  readonly top: number;
  readonly baseline: number;
}

/**
 * A band behind marked lines, a pixel short of their rows at both ends so the bands of neighbouring marks stay
 * apart, and the badge with its number at the left of the band's first line.
 */
export interface Band {
  readonly mark: Mark;
  readonly rect: Rect;
  readonly badge: { readonly x: number; readonly y: number };
}

/** A note below the card: its mark, the badge, and its text in lines that fit the card's width. */
export interface Note {
  readonly mark: Mark;
  readonly badge: { readonly x: number; readonly y: number };
  readonly x: number;
  readonly baselines: readonly number[];
  readonly lines: readonly string[];
  readonly rect: Rect;
}

/** A card placed at its top left corner, with its rows, bands, notes and where its line numbers end. */
export interface PlacedCard {
  readonly card: Card;
  readonly rect: Rect;
  readonly meta: string;
  readonly numbersEnd: number;
  readonly codeX: number;
  readonly rows: readonly Row[];
  readonly bands: readonly Band[];
  readonly notes: readonly Note[];
  /** The bottom of the card with its notes. */
  readonly bottom: number;
}

/** What the head shows right of the title: the file's name and the lines the card shows. */
export function metaOf(card: Card): string {
  const first = card.lines[0]?.number;
  const last = card.lines.at(-1)?.number;
  return first === undefined ? card.name : `${card.name} · ${first}-${last}`;
}

const digitsWidth = (card: Card): number =>
  textWidth(String(card.lines.at(-1)?.number ?? 0).replace(/\d/g, '0'), FONTS.code);

/** The width a card needs for its head and its widest line, its folds included. */
export function cardWidth(card: Card): number {
  const code = Math.max(0, ...card.lines.map((line) => runsWidth([{ text: line.text, font: FONTS.code }])));
  const body = 2 * CARD.padX + digitsWidth(card) + CARD.gutterGap + code;
  const head =
    2 * CARD.padX + textWidth(card.title, FONTS.cardTitle) + CARD.headGap + textWidth(metaOf(card), FONTS.cardMeta);
  return Math.ceil(Math.max(CARD.minWidth, body, head));
}

/** Places a card of width `w` at `(x, y)`: rows below the head, bands behind marked rows, notes below the card. */
export function placeCard(card: Card, x: number, y: number, w: number): PlacedCard {
  const numbersEnd = x + CARD.padX + digitsWidth(card);
  const bodyTop = y + CARD.head + CARD.padY;
  const rows = card.lines.map((line, i) => {
    const top = bodyTop + i * CARD.line;
    return { line, top, baseline: top + CARD.baseline };
  });
  const h = CARD.head + 2 * CARD.padY + rows.length * CARD.line;
  const bands = card.marks.flatMap((mark): Band[] => {
    const inside = rows.filter((row) => row.line.number >= mark.from && row.line.number <= mark.to);
    const first = inside[0];
    const last = inside.at(-1);
    if (first === undefined || last === undefined) return [];
    const rect = { x: x + 1, y: first.top + 1, w: w - 2, h: last.top + CARD.line - first.top - 2 };
    return [{ mark, rect, badge: { x: x - NOTE.margin, y: first.top + CARD.line / 2 } }];
  });
  const notes: Note[] = [];
  let bottom = y + h;
  for (const mark of card.marks) {
    if (mark.note === undefined) continue;
    const top = bottom + (notes.length === 0 ? NOTE.gap : NOTE.after);
    const lines = wrap(mark.note, w - NOTE.indent, FONTS.noteText);
    const baselines = lines.map((_, i) => top + NOTE.baseline + i * NOTE.line);
    const textW = Math.max(...lines.map((line) => textWidth(line, FONTS.noteText)));
    const rect = { x: x + NOTE.indent, y: top, w: textW, h: lines.length * NOTE.line };
    notes.push({
      mark,
      badge: { x: x + NOTE.badge, y: top + NOTE.line / 2 },
      x: x + NOTE.indent,
      baselines,
      lines,
      rect,
    });
    bottom = top + lines.length * NOTE.line;
  }
  return {
    card,
    rect: { x, y, w, h },
    meta: metaOf(card),
    numbersEnd,
    codeX: numbersEnd + CARD.gutterGap,
    rows,
    bands,
    notes,
    bottom,
  };
}
