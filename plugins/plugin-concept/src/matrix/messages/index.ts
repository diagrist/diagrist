import { type Catalogue, pick } from '@diagrist/core';

/** Messages of the matrix rules M100 to M107 and M600, in English and German. */
export const MATRIX_MESSAGES: Catalogue = {
  M100: {
    en: (v) =>
      `The matrix names no scale. Name one in the header, such as \`diagram matrix "Responsibilities" scale=raci\`. Scales: ${v.scales}.`,
    de: (v) =>
      `Die Matrix nennt keine Skala. Eine im Kopf nennen, etwa \`diagram matrix "Zuständigkeiten" scale=raci\`. Skalen: ${v.scales}.`,
  },
  M101: {
    en: (v) =>
      `The cell \`${v.col}\` of the row \`${v.row}\` holds \`${v.value}\`, which the scale \`${v.scale}\` does not know. Its values: ${v.allowed}.`,
    de: (v) =>
      `Die Zelle \`${v.col}\` der Zeile \`${v.row}\` enthält \`${v.value}\`, das die Skala \`${v.scale}\` nicht kennt. Ihre Werte: ${v.allowed}.`,
  },
  M102: {
    en: (v) =>
      `The cell \`${v.col}\` of the row \`${v.row}\` ${pick(v, { twice: `names \`${v.value}\` twice`, single: `holds \`${v.value}\`, but the scale \`${v.scale}\` allows one value per cell` })}.`,
    de: (v) =>
      `Die Zelle \`${v.col}\` der Zeile \`${v.row}\` ${pick(v, { twice: `nennt \`${v.value}\` zweimal`, single: `enthält \`${v.value}\`, die Skala \`${v.scale}\` erlaubt aber einen Wert je Zelle` })}.`,
  },
  M103: {
    en: (v) =>
      `The row \`${v.row}\` names the column \`${v.col}\` again; it already does in line ${v.first}. Write all values of a cell in one line, such as \`${v.col} R,A\`.`,
    de: (v) =>
      `Die Zeile \`${v.row}\` nennt die Spalte \`${v.col}\` noch einmal; das tut sie schon in Zeile ${v.first}. Alle Werte einer Zelle stehen in einer Zeile, etwa \`${v.col} R,A\`.`,
  },
  M104: {
    en: (v) =>
      `"${v.row}" ${pick(v, { none: `has no \`${v.value}\``, many: `has ${v.count} times \`${v.value}\`` })}; the scale \`${v.scale}\` asks for ${pick(v, { none: 'at least one', many: 'exactly one' })} per row.`,
    de: (v) =>
      `„${v.row}“ ${pick(v, { none: `hat kein \`${v.value}\``, many: `hat ${v.count}-mal \`${v.value}\`` })}; die Skala \`${v.scale}\` verlangt ${pick(v, { none: 'mindestens eins', many: 'genau eins' })} je Zeile.`,
  },
  M105: {
    en: (v) =>
      `The column "${v.col}" ${pick(v, { none: `has no \`${v.value}\``, many: `has more than one \`${v.value}\`` })}; the scale \`${v.scale}\` asks for ${pick(v, { none: 'at least one', many: 'exactly one' })} per column.`,
    de: (v) =>
      `Die Spalte „${v.col}“ ${pick(v, { none: `hat kein \`${v.value}\``, many: `hat mehr als ein \`${v.value}\`` })}; die Skala \`${v.scale}\` verlangt ${pick(v, { none: 'mindestens eins', many: 'genau eins' })} je Spalte.`,
  },
  M106: {
    en: (v) =>
      `${pick(v, { row: 'The row', col: 'The column' })} "${v.label}" holds no value, but \`cover=\` asks every ${pick(v, { row: 'row', col: 'column' })} for one.`,
    de: (v) =>
      `${pick(v, { row: 'Die Zeile', col: 'Die Spalte' })} „${v.label}“ enthält keinen Wert, \`cover=\` verlangt aber einen in jeder ${pick(v, { row: 'Zeile', col: 'Spalte' })}.`,
  },
  M107: {
    en: (v) =>
      `The row \`${v.row}\` belongs to the group \`${v.group}\`, but stands apart from its rows, which start with \`${v.first}\`. Move it below the others.`,
    de: (v) =>
      `Die Zeile \`${v.row}\` gehört zur Gruppe \`${v.group}\`, steht aber getrennt von deren Zeilen, die mit \`${v.first}\` beginnen. Sie unter die anderen stellen.`,
  },
  M600: {
    en: (v) =>
      `The matrix has ${v.count} ${pick(v, { cols: 'columns', rows: 'rows' })}; at most ${v.most} stay readable on a page. Split it into two matrices.`,
    de: (v) =>
      `Die Matrix hat ${v.count} ${pick(v, { cols: 'Spalten', rows: 'Zeilen' })}; lesbar auf einer Seite bleiben höchstens ${v.most}. Sie in zwei Matrizen teilen.`,
  },
};
