import type { Finding, Rule } from '@diagrist/core';
import { list } from '@diagrist/lang';
import type { MatrixModel } from '../model.js';

type MatrixRule = Rule<MatrixModel>;

/** Every cell with its row, for findings that name both. */
const cellsOf = (m: MatrixModel) => m.rows.flatMap((row) => row.cells.map((cell) => ({ row, cell })));

export const unknownValue: MatrixRule = {
  code: 'M101',
  severity: 'error',
  doc: 'A cell holds only values of the scale the header names, written as the scale writes them, such as `A` and not `a`.',
  check: (m) => {
    const scale = m.scale;
    if (scale === undefined) return [];
    const ids = new Set(scale.values.map((v) => v.id));
    return cellsOf(m).flatMap(({ row, cell }) =>
      cell.values
        .filter((value) => !ids.has(value))
        .map((value) => ({
          span: cell.span,
          values: { row: row.id, col: cell.col, value, scale: scale.name, allowed: list([...ids]) },
        })),
    );
  },
};

export const severalValues: MatrixRule = {
  code: 'M102',
  severity: 'error',
  doc: 'A cell names a value once, and only one value when its scale allows one per cell, as `cover` does.',
  check: (m) => {
    const scale = m.scale;
    if (scale === undefined) return [];
    return cellsOf(m).flatMap(({ row, cell }): Finding[] => {
      const twice = cell.values.find((value, i) => cell.values.indexOf(value) !== i);
      const base = { row: row.id, col: cell.col, scale: scale.name };
      if (twice !== undefined) return [{ span: cell.span, values: { ...base, case: 'twice', value: twice } }];
      if (!scale.several && cell.values.length > 1) {
        return [{ span: cell.span, values: { ...base, case: 'single', value: cell.values.join(',') } }];
      }
      return [];
    });
  },
};

export const columnTwice: MatrixRule = {
  code: 'M103',
  severity: 'error',
  doc: 'A row names each column once; all values of a cell stand in one line, separated by commas.',
  check: (m) =>
    m.rows.flatMap((row) =>
      row.cells.flatMap((cell, i): Finding[] => {
        const first = row.cells.find((other, j) => j < i && other.col === cell.col);
        return first === undefined
          ? []
          : [{ span: cell.span, values: { row: row.id, col: cell.col, first: String(first.span.line) } }];
      }),
    ),
};
