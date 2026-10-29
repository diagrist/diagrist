import { type MatrixWords, stop } from './words.js';

const plural = (n: number, one: string, many: string): string => (n === 1 ? `einer ${one}` : `${n} ${many}`);

/** The words of matrices in German. */
export const DE: MatrixWords = {
  kind: 'Matrix',
  scales: { raci: 'RACI', crud: 'CRUD', cover: 'Abdeckung' },
  values: {
    raci: { R: 'durchführend', A: 'verantwortlich', C: 'konsultiert', I: 'informiert' },
    crud: { C: 'legt an', R: 'liest', U: 'ändert', D: 'löscht' },
    cover: { full: 'deckt ab', part: 'deckt teilweise ab' },
  },
  rule: (count, axis) =>
    `${count === 'one' ? 'genau eins' : 'mindestens eins'} je ${axis === 'row' ? 'Zeile' : 'Spalte'}`,
  diagram: (title, rows, cols, scale) =>
    `Matrix „${title}“ mit ${plural(rows, 'Zeile', 'Zeilen')} und ${plural(cols, 'Spalte', 'Spalten')}, Skala ${scale}.`,
  group: (label) => stop(`Gruppe ${label}`),
  row: (label, parts) =>
    parts.length === 0
      ? stop(`${label}: keine Werte`)
      : stop(`${label}: ${parts.map(([value, cols]) => `${value} ${cols.join(', ')}`).join('; ')}`),
  note: (n, text, on) => `Anmerkung ${n}${on ? ` zu ${on}` : ''}: ${stop(text)}`,
};
