import {
  type CodeLanguage,
  type CodeLine,
  type Excerpt,
  excerpt,
  highlight,
  languageOf,
  outline,
  type Selection,
} from '@diagrist/code';
import type { KindReading, Span } from '@diagrist/lang';
import type { CodeStatement } from './grammar/spec.js';

type Of<K extends CodeStatement['keyword']> = Extract<CodeStatement, { keyword: K }>;

/** The ways a card selects its lines, in the order the docs recommend them. */
export const SELECTIONS = ['symbol', 'region', 'lines'] as const;

/** A way a card selects its lines. */
export type SelectionKind = (typeof SELECTIONS)[number];

/** Lines of a card marked with a band and a number, counted across the picture in source order. */
export interface Mark {
  readonly n: number;
  readonly from: number;
  readonly to: number;
  readonly note?: string;
  readonly span: Span;
}

/** What a selection missed, and what the file offers instead (see `Excerpt` of `@diagrist/code`). */
export interface Missing {
  readonly case: SelectionKind;
  readonly asked: string;
  readonly found: readonly string[];
  readonly nearest?: string;
  readonly last: number;
}

/** A card: where its code comes from and the lines it shows, with the numbers of the file. */
export interface Card {
  readonly id: string;
  readonly title: string;
  /** The file as the host resolved it, for diagnostics; absent when `src` is missing. */
  readonly path?: string;
  /** The file's name without folders, which the picture shows, so it reads the same wherever `dgr` runs. */
  readonly name: string;
  readonly language: CodeLanguage;
  /** The selections the line names; a rule refuses more than one. */
  readonly chosen: readonly SelectionKind[];
  readonly lines: readonly CodeLine[];
  readonly marks: readonly Mark[];
  readonly missing?: Missing;
  readonly span: Span;
}

/** An arrow from a line of one card to another card. */
export interface Link {
  readonly from: string;
  readonly line: number;
  readonly to: string;
  readonly label?: string;
  readonly span: Span;
}

/** A code diagram as rules, layout and description see it. */
export interface CodeModel {
  readonly title: string;
  readonly subtitle?: string;
  readonly cards: readonly Card[];
  readonly links: readonly Link[];
}

/** The selection a card names first, in the order of `SELECTIONS`, and how it is written for a message. */
function selectionOf(s: Of<'source'>): { selection?: Selection; asked: string } {
  const { symbol, region, lines } = s.attributes;
  if (symbol !== undefined) return { selection: { symbol }, asked: symbol };
  if (region !== undefined) return { selection: { region }, asked: region };
  if (lines !== undefined) return { selection: { lines }, asked: `${lines[0]}-${lines[1]}` };
  return { asked: '' };
}

function card(s: Of<'source'>, marks: readonly Mark[]): Card {
  const { src, lang } = s.attributes;
  const language = lang ?? languageOf(src?.path ?? '');
  const { selection, asked } = selectionOf(s);
  const cut: Excerpt = src === undefined ? { lines: [] } : excerpt(highlight(src, language), selection);
  const shown = 'lines' in cut ? (s.flags.outline ? outline(cut.lines) : cut.lines) : [];
  const missing =
    'missing' in cut && selection !== undefined
      ? { case: cut.missing, asked, found: cut.found, last: cut.last, ...(cut.nearest ? { nearest: cut.nearest } : {}) }
      : undefined;
  return {
    id: s.id,
    title: s.title,
    ...(src === undefined ? {} : { path: src.path }),
    name: src?.path.split('/').at(-1) ?? '',
    language,
    chosen: SELECTIONS.filter((kind) => s.attributes[kind] !== undefined),
    lines: shown,
    marks,
    ...(missing === undefined ? {} : { missing }),
    span: s.span,
  };
}

/** Reads the cards and links: each file highlighted whole, then cut; marks numbered across the picture. */
export function codeModel(reading: KindReading<CodeStatement>): CodeModel {
  let n = 0;
  const cards = reading.statements
    .filter((s): s is Of<'source'> => s.keyword === 'source')
    .map((s) => {
      const marks = s.children.map(({ range: [from, to], note, span }) => ({
        n: ++n,
        from,
        to,
        span,
        ...(note === undefined ? {} : { note }),
      }));
      return card(s, marks);
    });
  const links = reading.statements
    .filter((s): s is Of<'link'> => s.keyword === 'link')
    .map(({ from, fromLine, to, label, span }) => ({
      from,
      line: fromLine,
      to,
      span,
      ...(label === undefined ? {} : { label }),
    }));
  const subtitle = reading.header?.attributes.subtitle;
  return {
    title: reading.header?.title ?? '',
    ...(typeof subtitle === 'string' ? { subtitle } : {}),
    cards,
    links,
  };
}
