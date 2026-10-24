import type { Catalogue } from '@diagrist/core';

type Values = Readonly<Record<string, string>>;

/** Picks the text for `v.case` from a table, so a finding names its case as data, not as prose. */
export const pick = (v: Values, cases: Readonly<Record<string, string>>): string => cases[v.case ?? ''] ?? v.case ?? '';

/** Messages of the model errors, in English and German. A109 has its own catalogue entry in `layout-errors.ts`. */
export const ERRORS: Catalogue = {
  A001: {
    en: () => 'A note needs the element it points at: `note "Text" on <id>`.',
    de: () => 'Eine Notiz braucht das Element, auf das sie zeigt: `note "Text" on <id>`.',
  },
  A007: {
    en: (v) =>
      `The group \`${v.id}\` ${pick(v, { none: 'has no role', several: `has several roles (${v.roles})` })}. Give it exactly one of \`own\`, \`shared\`, \`external\`, e.g. \`group ${v.id} "Title" own\`.`,
    de: (v) =>
      `Die Gruppe \`${v.id}\` ${pick(v, { none: 'hat keine Rolle', several: `hat mehrere Rollen (${v.roles})` })}. Genau eine von \`own\`, \`shared\`, \`external\` angeben, etwa \`group ${v.id} "Titel" own\`.`,
  },
  A008: {
    en: (v) =>
      `The element \`${v.id}\` has no place. Put it into the grid with \`at <column>/<row>\`, e.g. \`at ${v.example}\`.`,
    de: (v) =>
      `Das Element \`${v.id}\` hat keinen Platz. Mit \`at <Spalte>/<Zeile>\` ins Raster setzen, etwa \`at ${v.example}\`.`,
  },
  A103: {
    en: (v) =>
      `The ${pick(v, { column: 'column', row: 'row' })} \`${v.found}\` of \`${v.id}\` is not in the grid. ${pick(v, { column: 'Columns', row: 'Rows' })}: ${v.known}.`,
    de: (v) =>
      `Die ${pick(v, { column: 'Spalte', row: 'Zeile' })} \`${v.found}\` von \`${v.id}\` steht nicht im Raster. ${pick(v, { column: 'Spalten', row: 'Zeilen' })}: ${v.known}.`,
  },
  A105: {
    en: (v) =>
      `The edge from \`${v.id}\` leads back to \`${v.id}\`. An edge connects two different elements or groups.`,
    de: (v) =>
      `Die Kante von \`${v.id}\` führt zurück zu \`${v.id}\`. Eine Kante verbindet zwei verschiedene Elemente oder Gruppen.`,
  },
  A106: {
    en: (v) =>
      `The ${pick(v, { cols: 'column', rows: 'row' })} \`${v.name}\` is named twice in the grid. Give each a name of its own.`,
    de: (v) =>
      `Die ${pick(v, { cols: 'Spalte', rows: 'Zeile' })} \`${v.name}\` steht zweimal im Raster. Jeder einen eigenen Namen geben.`,
  },
  A107: {
    en: (v) =>
      `The edge \`${v.from}\` to \`${v.to}\` leads to the group that holds \`${v.node}\`. Point it at an element outside the group.`,
    de: (v) =>
      `Die Kante \`${v.from}\` zu \`${v.to}\` führt zur Gruppe, in der \`${v.node}\` liegt. Auf ein Element außerhalb der Gruppe richten.`,
  },
};
