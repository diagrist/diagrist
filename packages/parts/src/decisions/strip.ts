import { type Font, STANDARD_FONTS, textWidth } from '@diagrist/core';
import { MARGIN, type Spot } from '../sheet/header.js';
import { wrap } from '../text.js';
import type { Decision } from './adr.js';

/** One card of the decision bar, with the baselines of its three texts. */
export interface DecisionCard {
  readonly decision: Decision;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly question: Spot;
  /** The question in lines that fit the card, one `QUESTION_STEP` below the other, where one line does not. */
  readonly questionLines?: readonly string[];
  /** The consequence in lines that fit the card, as the question, where one line does not. */
  readonly consequenceLines?: readonly string[];
  readonly choice: Spot;
  readonly consequence: Spot;
}

/** The decision bar below the picture: a heading and cards of equal width in one row. */
export interface Strip {
  readonly y: number;
  readonly heading: Spot;
  readonly cards: readonly DecisionCard[];
  /** Lower edge of the bar; without decisions the top, so the picture does not grow. */
  readonly bottom: number;
}

const TOP_GAP = 48;
const HEADING_DY = 12;
const TEXT_X = 12;
const QUESTION_DY = 20;
const CHOICE_DY = 40;
const CONSEQUENCE_DY = 58;
const GAP = 16;
const CARD_H = 78;
const STRIP_H = 128;
/** Inner padding of the texts on a card. */
const CARD_PAD = 12;
/** Step between the lines of a wrapped question. */
export const QUESTION_STEP = 14;

/** What the bar measures a question with: the words of an open decision and the font of the note role. */
export interface QuestionMeasure {
  readonly open: (who: string) => string;
  readonly font: Font;
}

/** The first line of a card: id and question, and who decides while it is open. */
export const questionText = (d: Decision, open: (who: string) => string): string =>
  `${d.id}  ${d.question}${d.open ? ` ${open(d.open)}` : ''}`;

/**
 * Bar below a picture of width `width` whose content ends at `bodyBottom`. With `measure`, a question or consequence
 * wider than its card wraps, and every card grows by the lines the longest of each adds; without it a kind sizes the
 * picture to the bar (`stripWidth`).
 */
export function decisionStrip(
  decisions: readonly Decision[],
  bodyBottom: number,
  width: number,
  measure?: QuestionMeasure,
): Strip {
  const y = bodyBottom + TOP_GAP;
  const heading = { x: MARGIN, y: y - HEADING_DY };
  if (decisions.length === 0) return { y, heading, cards: [], bottom: y };
  const w = (width - 2 * MARGIN - GAP * (decisions.length - 1)) / decisions.length;
  const fitted = (text: string | undefined) => {
    const room = w - 2 * CARD_PAD;
    if (!measure || text === undefined || textWidth(text, measure.font) <= room) return undefined;
    return wrap(text, room, measure.font);
  };
  const more = (all: readonly (readonly string[] | undefined)[]) =>
    Math.max(0, ...all.map((l) => (l ? l.length - 1 : 0))) * QUESTION_STEP;
  const lines = decisions.map((d) => (measure ? fitted(questionText(d, measure.open)) : undefined));
  const notes = decisions.map((d) => fitted(d.consequence));
  const extra = more(lines);
  const below = more(notes);
  const cards = decisions.map((decision, i) => {
    const x = MARGIN + i * (w + GAP);
    const wrapped = lines[i];
    const note = notes[i];
    return {
      decision,
      x,
      y,
      w,
      h: CARD_H + extra + below,
      question: { x: x + TEXT_X, y: y + QUESTION_DY },
      ...(wrapped ? { questionLines: wrapped } : {}),
      ...(note ? { consequenceLines: note } : {}),
      choice: { x: x + TEXT_X, y: y + CHOICE_DY + extra },
      consequence: { x: x + TEXT_X, y: y + CONSEQUENCE_DY + extra },
    };
  });
  return { y, heading, cards, bottom: y + STRIP_H + extra + below };
}

/** The width the bar needs: every card as wide as its longest text, plus the margins of the sheet. */
export function stripWidth(decisions: readonly Decision[], open: (who: string) => string): number {
  if (decisions.length === 0) return 0;
  const { note, name } = STANDARD_FONTS;
  const cards = decisions.map(
    (d) =>
      Math.max(
        textWidth(questionText(d, open), note),
        textWidth(d.choice, name),
        textWidth(d.consequence ?? '', note),
      ) +
      2 * CARD_PAD,
  );
  return cards.reduce((sum, w) => sum + w, 0) + GAP * (cards.length - 1) + 2 * MARGIN;
}
