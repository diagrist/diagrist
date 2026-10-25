import type { CodeLanguage } from '@diagrist/code';
import { textWidth } from '@diagrist/core';
import type { Locale } from '@diagrist/lang';
import { imageTitle, MARGIN } from '@diagrist/parts';
import type { Card, CodeModel } from './model.js';
import { FONTS } from './styles.js';

/** How the languages are named in the kicker and the description. */
const LANGUAGE_NAMES: Readonly<Record<CodeLanguage, string>> = {
  java: 'Java',
  kotlin: 'Kotlin',
  sql: 'SQL',
  yaml: 'YAML',
  json: 'JSON',
  xml: 'XML',
  text: '',
};

/** The words of code diagrams in one locale: the kind's name and the sentences of the description. */
interface Words {
  readonly kind: string;
  readonly diagram: (title: string, cards: number) => string;
  readonly card: (card: Card, language: string, range: string) => string;
  readonly mark: (n: number, from: number, to: number, note: string | undefined) => string;
  readonly link: (line: number, from: string, to: string, label: string | undefined) => string;
}

/** The end of a sentence: `: <text>.` with a text that may end in a stop of its own, else just the stop. */
const said = (text: string | undefined): string => (text ? `: ${text.replace(/[.!?]$/, '')}.` : '.');

const EN: Words = {
  kind: 'Code',
  diagram: (title, cards) => `Code diagram "${title}" with ${cards === 1 ? 'one card' : `${cards} cards`}.`,
  card: (card, language, range) => `${card.title}: ${language || 'text'}, lines ${range} of ${card.name}.`,
  mark: (n, from, to, note) => `Mark ${n}, ${from === to ? `line ${from}` : `lines ${from}-${to}`}${said(note)}`,
  link: (line, from, to, label) => `Line ${line} of ${from} leads to ${to}${said(label)}`,
};

const DE: Words = {
  kind: 'Code',
  diagram: (title, cards) => `Code-Diagramm „${title}“ mit ${cards === 1 ? 'einer Karte' : `${cards} Karten`}.`,
  card: (card, language, range) => `${card.title}: ${language || 'Text'}, Zeilen ${range} aus ${card.name}.`,
  mark: (n, from, to, note) => `Marke ${n}, ${from === to ? `Zeile ${from}` : `Zeilen ${from}-${to}`}${said(note)}`,
  link: (line, from, to, label) => `Zeile ${line} von ${from} führt zu ${to}${said(label)}`,
};

const WORDS: Readonly<Record<Locale, Words>> = { en: EN, de: DE };

/** What the kicker header writes, its width for the picture, and the picture's accessible title. */
export interface Header {
  readonly kicker: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly alt: string;
  readonly width: number;
}

/** The header: `CODE · JAVA, SQL` above the title, with the languages of the cards in their first order. */
export function headerOf(model: CodeModel, locale: Locale): Header {
  const languages = [...new Set(model.cards.map((card) => LANGUAGE_NAMES[card.language]).filter(Boolean))];
  const kicker = [WORDS[locale].kind, languages.join(', ')].filter(Boolean).join(' · ').toUpperCase();
  const widths = [
    textWidth(kicker, FONTS.group),
    textWidth(model.title, FONTS.title),
    model.subtitle ? textWidth(model.subtitle, FONTS.note) : 0,
  ];
  return {
    kicker,
    title: model.title,
    ...(model.subtitle ? { subtitle: model.subtitle } : {}),
    alt: imageTitle(WORDS[locale].kind, model.title),
    width: MARGIN + Math.max(...widths),
  };
}

const rangeOf = (card: Card): string => `${card.lines[0]?.number ?? 0}-${card.lines.at(-1)?.number ?? 0}`;

/** The diagram in sentences: each card with its language, lines and file, each mark with its note, each link. */
export function describeCode(model: CodeModel, locale: Locale): string {
  const w = WORDS[locale];
  return [
    w.diagram(model.title, model.cards.length),
    ...model.cards.flatMap((card) => [
      w.card(card, LANGUAGE_NAMES[card.language], rangeOf(card)),
      ...card.marks.map((m) => w.mark(m.n, m.from, m.to, m.note)),
    ]),
    ...model.links.map((l) => w.link(l.line, l.from, l.to, l.label)),
  ].join(' ');
}
