import type { Finding, Rule } from '@diagrist/core';
import { list } from '@diagrist/lang';
import type { Card, CodeModel } from '../model.js';

type CodeRule = Rule<CodeModel>;

/** More lines than this make a card taller than a page; a picture is not an editor. */
const MOST = 40;

/** The lines a card shows, as `25-36`. */
const shownOf = (card: Card): string => `${card.lines[0]?.number ?? 0}-${card.lines.at(-1)?.number ?? 0}`;

const shows = (card: Card, line: number): boolean => card.lines.some((shown) => shown.number === line);

/** Whether the lines of a card are what its line asks for, so findings about marks and links mean something. */
const sound = (card: Card): boolean => card.path !== undefined && card.chosen.length <= 1 && card.missing === undefined;

const noFile: CodeRule = {
  code: 'S100',
  severity: 'error',
  doc: 'Every card names its file with `src=`; the picture shows that file as it is when it is built.',
  check: (m) => m.cards.filter((c) => c.path === undefined).map((c) => ({ span: c.span, values: { id: c.id } })),
};

const oneSelection: CodeRule = {
  code: 'S101',
  severity: 'error',
  doc: 'A card selects its lines in one way at most: `symbol=`, `region=` or `lines=`.',
  check: (m) =>
    m.cards
      .filter((c) => c.chosen.length > 1)
      .map((c) => ({
        span: c.span,
        values: { id: c.id, count: String(c.chosen.length), chosen: list(c.chosen.map((k) => `${k}=`)) },
      })),
};

const selection: CodeRule = {
  code: 'S102',
  severity: 'error',
  doc: 'The declaration, region or lines a card selects exist in its file as it is now. The finding names what the file declares or marks instead, and the nearest name.',
  check: (m) =>
    m.cards.flatMap((c): Finding[] => {
      const missed = c.missing;
      if (missed === undefined || c.chosen.length > 1) return [];
      const found = missed.case === 'lines' ? `1-${missed.last}` : list(missed.found);
      return [
        {
          span: c.span,
          values: {
            id: c.id,
            file: c.path ?? '',
            case: missed.case,
            asked: missed.asked,
            found,
            nearest: missed.nearest ?? '',
            last: String(missed.last),
          },
        },
      ];
    }),
};

const markShown: CodeRule = {
  code: 'S103',
  severity: 'error',
  doc: 'A mark names lines its card shows, counted as in the file.',
  check: (m) =>
    m.cards.filter(sound).flatMap((c) =>
      c.marks
        .filter((mark) => !shows(c, mark.from) || !shows(c, mark.to))
        .map((mark) => ({
          span: mark.span,
          values: {
            id: c.id,
            range: mark.from === mark.to ? `${mark.from}` : `${mark.from}-${mark.to}`,
            shown: shownOf(c),
          },
        })),
    ),
};

const linkShown: CodeRule = {
  code: 'S104',
  severity: 'error',
  doc: 'A link starts at a line its card shows and leads to another card.',
  check: (m) =>
    m.links.flatMap((l): Finding[] => {
      if (l.from === l.to) return [{ span: l.span, values: { case: 'self', id: l.from, line: '', shown: '' } }];
      const from = m.cards.find((c) => c.id === l.from);
      if (from === undefined || !sound(from) || shows(from, l.line)) return [];
      return [{ span: l.span, values: { case: 'line', id: l.from, line: String(l.line), shown: shownOf(from) } }];
    }),
};

const longCard: CodeRule = {
  code: 'S600',
  severity: 'warning',
  doc: `A card shows at most ${MOST} lines; more is read in the editor, not in a picture.`,
  check: (m) =>
    m.cards
      .filter((c) => c.lines.length > MOST)
      .map((c) => ({ span: c.span, values: { id: c.id, count: String(c.lines.length), most: String(MOST) } })),
};

/** The rules of code diagrams, errors first. */
export const CODE_RULES: readonly CodeRule[] = [noFile, oneSelection, selection, markShown, linkShown, longCard];
