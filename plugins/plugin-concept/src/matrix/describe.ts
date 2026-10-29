import type { Locale } from '@diagrist/lang';
import type { MatrixModel, Row } from './model.js';
import { MATRIX_WORDS } from './texts/index.js';
import type { MatrixWords } from './texts/words.js';

/** A row's values in the order of the scale, each with the heads of the columns that hold it. */
function partsOf(model: MatrixModel, row: Row, w: MatrixWords): (readonly [string, readonly string[]])[] {
  const scale = model.scale;
  if (scale === undefined) return [];
  const label = (col: string) => model.cols.find((c) => c.id === col)?.label ?? col;
  return scale.values.flatMap((value) => {
    const cols = model.cols.filter((c) =>
      row.cells.some((cell) => cell.col === c.id && cell.values.includes(value.id)),
    );
    return cols.length === 0
      ? []
      : [[w.values[scale.name][value.id] ?? value.id, cols.map((c) => label(c.id))] as const];
  });
}

/** The matrix in sentences: what it is, then row by row the values with their columns, a group before its rows. */
export function describeMatrix(model: MatrixModel, locale: Locale): string {
  const w = MATRIX_WORDS[locale];
  const scale = model.scale ? w.scales[model.scale.name] : '';
  const headOf = (id: string) => [...model.rows, ...model.cols].find((h) => h.id === id)?.label;
  return [
    w.diagram(model.title, model.rows.length, model.cols.length, scale),
    ...model.rows.flatMap((row, i) => {
      const band = row.group !== undefined && model.rows[i - 1]?.group !== row.group;
      const group = model.groups.find((g) => g.id === row.group);
      return [...(band && group ? [w.group(group.label)] : []), w.row(row.label, partsOf(model, row, w))];
    }),
    ...model.notes.map((n) => w.note(n.n, n.text, n.on === undefined ? undefined : headOf(n.on))),
  ].join(' ');
}
