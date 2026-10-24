import type { Catalogue } from '@diagrist/core';
import { pick } from './errors.js';

type Values = Readonly<Record<string, string>>;

const EN = (v: Values): string =>
  pick(v, {
    needsAdaptive: `\`${v.what}\` needs \`layout=adaptive\` in the header; a fixed grid keeps its measures.`,
    personArea: `The person \`${v.id}\` cannot take \`span\` or \`slot\`; a person stands in one place.`,
    spanColumn: `The end column \`${v.found}\` of \`${v.id}\` must be in the grid, at or right of \`${v.start}\`.`,
    spanRow: `The end row \`${v.found}\` of \`${v.id}\` must be in the grid, at or below \`${v.start}\`.`,
    slotAxes: `\`slot\` of \`${v.id}\` divides an area over columns or over rows, not both; give \`span\` one of them.`,
    coverColumn: `The column \`${v.found}\` of \`cover\` is not in the grid. Columns: ${v.known}.`,
    groupCycle: `The group \`${v.id}\` lies in itself through \`in\`. Nest groups without a cycle.`,
    bundleEnds: `The edges of the bundle \`${v.name}\` need a shared start or a shared end.`,
    bundleKinds: `The bundle \`${v.name}\` mixes kinds of edges; give its edges the same arrow.`,
    layerRow: `The layer names the row \`${v.found}\`, which is not in the grid. Rows: ${v.known}.`,
    layerTwice: `The row \`${v.found}\` has a layer already; one layer per row.`,
  });

const DE = (v: Values): string =>
  pick(v, {
    needsAdaptive: `\`${v.what}\` braucht \`layout=adaptive\` in der Kopfzeile; ein festes Raster behält seine Maße.`,
    personArea: `Die Person \`${v.id}\` kann kein \`span\` und kein \`slot\` haben; eine Person steht an einem Platz.`,
    spanColumn: `Die Endspalte \`${v.found}\` von \`${v.id}\` muss im Raster stehen, auf oder rechts von \`${v.start}\`.`,
    spanRow: `Die Endzeile \`${v.found}\` von \`${v.id}\` muss im Raster stehen, auf oder unter \`${v.start}\`.`,
    slotAxes: `\`slot\` von \`${v.id}\` teilt einen Bereich über Spalten oder über Zeilen, nicht beides; \`span\` eines davon geben.`,
    coverColumn: `Die Spalte \`${v.found}\` von \`cover\` steht nicht im Raster. Spalten: ${v.known}.`,
    groupCycle: `Die Gruppe \`${v.id}\` liegt über \`in\` in sich selbst. Gruppen ohne Kreis schachteln.`,
    bundleEnds: `Die Kanten der Sammelleitung \`${v.name}\` brauchen einen gemeinsamen Anfang oder ein gemeinsames Ende.`,
    bundleKinds: `Die Sammelleitung \`${v.name}\` mischt Kantenarten; ihren Kanten denselben Pfeil geben.`,
    layerRow: `Die Ebene nennt die Zeile \`${v.found}\`, die nicht im Raster steht. Zeilen: ${v.known}.`,
    layerTwice: `Die Zeile \`${v.found}\` hat schon eine Ebene; eine Ebene je Zeile.`,
  });

/** The message of A109, whose cases are the constraints of areas, groups, bundles and layers. */
export const LAYOUT_ERRORS: Catalogue = { A109: { en: EN, de: DE } };
