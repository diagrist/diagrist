import type { Finding, Rule } from '@diagrist/core';
import type { Head, MatrixModel } from '../model.js';
import type { Count, ScaleValue } from '../scales.js';

type MatrixRule = Rule<MatrixModel>;

/** How often `value` stands in the given cells. */
const countIn = (values: readonly (readonly string[])[], value: string): number =>
  values.filter((cell) => cell.includes(value)).length;

/** The case of a broken count, or nothing when `count` holds for `found`. */
const broken = (count: Count, found: number): 'none' | 'many' | undefined => {
  if (found === 0) return 'none';
  return count === 'one' && found > 1 ? 'many' : undefined;
};

/** The values of the scale that ask for a count along an axis, with that count. */
const counted = (m: MatrixModel, axis: 'row' | 'col'): (readonly [ScaleValue, Count])[] =>
  (m.scale?.values ?? []).flatMap((v) => {
    const count = v[axis];
    return count === undefined ? [] : [[v, count] as const];
  });

export const rowCount: MatrixRule = {
  code: 'M104',
  severity: 'error',
  doc: 'Every row holds the values its scale asks for: with `raci` exactly one A and at least one R.',
  check: (m) =>
    m.rows.flatMap((row) =>
      counted(m, 'row').flatMap(([value, count]): Finding[] => {
        const found = countIn(
          row.cells.map((c) => c.values),
          value.id,
        );
        const fault = broken(count, found);
        return fault === undefined
          ? []
          : [
              {
                span: row.span,
                values: {
                  case: fault,
                  row: row.label,
                  value: value.id,
                  scale: m.scale?.name ?? '',
                  count: String(found),
                },
              },
            ];
      }),
    ),
};

/** The values of every cell in a column. */
const columnValues = (m: MatrixModel, col: Head): (readonly string[])[] =>
  m.rows.flatMap((row) => row.cells.filter((c) => c.col === col.id).map((c) => c.values));

export const colCount: MatrixRule = {
  code: 'M105',
  severity: 'error',
  doc: 'Every column holds the values its scale asks for: with `crud` at least one C and one R, so every object is created and read somewhere.',
  check: (m) =>
    m.cols.flatMap((col) =>
      counted(m, 'col').flatMap(([value, count]): Finding[] => {
        const fault = broken(count, countIn(columnValues(m, col), value.id));
        return fault === undefined
          ? []
          : [{ span: col.span, values: { case: fault, col: col.label, value: value.id, scale: m.scale?.name ?? '' } }];
      }),
    ),
};

export const uncovered: MatrixRule = {
  code: 'M106',
  severity: 'error',
  doc: 'Under `cover=` every row, every column or both hold at least one value; `scale=cover` asks for both, so a requirement no building block meets and a building block that meets none show up.',
  check: (m) => {
    const rows = m.cover === 'rows' || m.cover === 'both';
    const cols = m.cover === 'cols' || m.cover === 'both';
    const emptyRows = rows ? m.rows.filter((row) => row.cells.length === 0) : [];
    const emptyCols = cols ? m.cols.filter((col) => columnValues(m, col).length === 0) : [];
    return [
      ...emptyRows.map((row) => ({ span: row.span, values: { case: 'row', label: row.label } })),
      ...emptyCols.map((col) => ({ span: col.span, values: { case: 'col', label: col.label } })),
    ];
  },
};
