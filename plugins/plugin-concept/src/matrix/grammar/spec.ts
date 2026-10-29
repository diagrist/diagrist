import { localeAttribute } from '@diagrist/core';
import { arg, attr, type Infer, id, kind, lines, oneOf, ref, statement, text, type Value } from '@diagrist/lang';
import { SCALE_NAMES } from '../scales.js';

const VALUES = /^[^,\s]+(,[^,\s]+)*$/u;

/** The values of one cell, separated by commas without spaces, such as `R,A`; the rules compare them with the scale. */
const cellValues = (): Value<readonly string[]> => ({
  type: 'cell-values',
  expected: 'one value of the scale or several separated by commas without spaces, like `R` or `R,A`',
  tokens: ['word'],
  read: (raw) => (VALUES.test(raw) ? { ok: true, value: raw.split(',') } : { ok: false }),
});

const col = statement('col', {
  doc: 'A column, such as a role, an object or a building block. Columns stand from left to right in the order written.',
  examples: ['col station "Stationsteam"'],
  arguments: [
    arg('id', id(), 'Id that the cells of the rows name.'),
    arg('label', text(), 'Head of the column, wrapped when it is long.'),
  ],
});

const group = statement('group', {
  doc: 'A band over rows that belong together, such as the steps of one process. Its rows name it with `in` and stand one after another.',
  examples: ['group vorgang "Vorgang"'],
  arguments: [
    arg('id', id(), 'Id that `in` of the rows names.'),
    arg('label', text(), 'Text of the band, above its first row.'),
  ],
});

const cell = lines({
  doc: 'A cell of the row: the column and its values from the scale. A column the row does not name stays empty.',
  examples: ['station A', 'kunde R,A'],
  arguments: [
    arg('col', ref('col'), 'The column of the cell.'),
    arg('values', cellValues(), 'The values, from the scale of the header; several only where the scale allows them.'),
  ],
});

const row = statement('row', {
  doc: 'A row, such as a task, a use case or a requirement, from top to bottom in the order written. Its cells stand indented below it, one line per column that holds a value.',
  examples: ['row ausleihen "Rad ausleihen" in vorgang', 'row mahnung "Mahnung senden"'],
  arguments: [
    arg('id', id(), 'Id that notes name with `on`.'),
    arg('label', text(), 'Head of the row at the left, wrapped when it is long.'),
  ],
  clauses: { in: attr(ref('group'), 'The group whose band it stands under.') },
  lines: cell,
});

const note = statement('note', {
  doc: 'A numbered note below the matrix. With `on` its number also stands at the head of a row or column.',
  examples: ['note "Bei Schäden über 500 Euro entscheidet die Versicherung." on schaden', 'note "Stand: Konzept 1.2"'],
  arguments: [arg('text', text(), 'What the note says.')],
  clauses: { on: attr(ref('row', 'col'), 'The row or column the note is about.') },
});

const statements = [col, group, row, note] as const;

/** The statement tables of matrices. */
export const matrixSpec = kind('matrix', {
  doc: 'A matrix: columns, rows and one scale, with the values of the scale in the cells. The scale carries rules that are checked: `raci` asks every row for exactly one A and at least one R, `crud` every column for a C and an R, `cover` every row and column for a mark.',
  header: {
    subtitle: attr(text(), 'Second line below the title.'),
    scale: attr(
      oneOf(SCALE_NAMES),
      'The scale of every cell, required: `raci` (R responsible, A accountable, C consulted, I informed; several per cell), `crud` (C create, R read, U update, D delete; several per cell) or `cover` (`full` or `part`, one per cell).',
    ),
    cover: attr(
      oneOf(['rows', 'cols', 'both']),
      'Which lines need at least one value: every row, every column, or both. `scale=cover` asks for both by default.',
    ),
    locale: localeAttribute,
  },
  statements,
});

/** Typed value of a top-level statement, derived from the tables (ADR 0004). */
export type MatrixStatement = Infer<(typeof statements)[number]>;
