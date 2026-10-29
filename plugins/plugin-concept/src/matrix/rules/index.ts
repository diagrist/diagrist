import type { Finding, Rule } from '@diagrist/core';
import { list } from '@diagrist/lang';
import type { MatrixModel } from '../model.js';
import { SCALE_NAMES } from '../scales.js';
import { columnTwice, severalValues, unknownValue } from './cells.js';
import { colCount, rowCount, uncovered } from './counts.js';

type MatrixRule = Rule<MatrixModel>;

/** More columns than this get too wide for a page; more rows than this too long to read as one table. */
const MOST = { cols: 12, rows: 40 } as const;

const noScale: MatrixRule = {
  code: 'M100',
  severity: 'error',
  doc: 'The header names the scale of the cells with `scale=`, since its values and rules decide what the cells may hold.',
  check: (m) => (m.scale === undefined ? [{ span: m.span, values: { scales: list(SCALE_NAMES) } }] : []),
};

const groupApart: MatrixRule = {
  code: 'M107',
  severity: 'error',
  doc: 'The rows of a group stand one after another, since its band stands above its first row only.',
  check: (m) =>
    m.rows.flatMap((row, i): Finding[] => {
      const group = row.group;
      if (group === undefined || m.rows[i - 1]?.group === group) return [];
      const earlier = m.rows.slice(0, i).find((r) => r.group === group);
      return earlier === undefined ? [] : [{ span: row.span, values: { group, row: row.id, first: earlier.id } }];
    }),
};

const tooLarge: MatrixRule = {
  code: 'M600',
  severity: 'warning',
  doc: `A matrix has at most ${MOST.cols} columns and ${MOST.rows} rows; a larger one no longer fits a page and is read better as two.`,
  check: (m) =>
    (['cols', 'rows'] as const)
      .filter((axis) => m[axis].length > MOST[axis])
      .map((axis) => ({
        span: m.span,
        values: { case: axis, count: String(m[axis].length), most: String(MOST[axis]) },
      })),
};

/** The rules of matrices, errors first. */
export const MATRIX_RULES: readonly MatrixRule[] = [
  noScale,
  unknownValue,
  severalValues,
  columnTwice,
  rowCount,
  colCount,
  uncovered,
  groupApart,
  tooLarge,
];
