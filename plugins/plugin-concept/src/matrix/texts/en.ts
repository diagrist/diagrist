import { type MatrixWords, stop } from './words.js';

const plural = (n: number, one: string, many: string): string => (n === 1 ? `one ${one}` : `${n} ${many}`);

/** The words of matrices in English. */
export const EN: MatrixWords = {
  kind: 'Matrix',
  scales: { raci: 'RACI', crud: 'CRUD', cover: 'coverage' },
  values: {
    raci: { R: 'responsible', A: 'accountable', C: 'consulted', I: 'informed' },
    crud: { C: 'creates', R: 'reads', U: 'updates', D: 'deletes' },
    cover: { full: 'covers', part: 'covers in part' },
  },
  rule: (count, axis) => `${count === 'one' ? 'exactly one' : 'at least one'} per ${axis === 'row' ? 'row' : 'column'}`,
  diagram: (title, rows, cols, scale) =>
    `Matrix "${title}" with ${plural(rows, 'row', 'rows')} and ${plural(cols, 'column', 'columns')}, scale ${scale}.`,
  group: (label) => stop(`Group ${label}`),
  row: (label, parts) =>
    parts.length === 0
      ? stop(`${label}: no values`)
      : stop(`${label}: ${parts.map(([value, cols]) => `${value} ${cols.join(', ')}`).join('; ')}`),
  note: (n, text, on) => `Note ${n}${on ? ` on ${on}` : ''}: ${stop(text)}`,
};
