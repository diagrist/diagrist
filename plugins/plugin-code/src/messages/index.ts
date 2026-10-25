import { type Catalogue, pick } from '@diagrist/core';
import { didYouMean } from '@diagrist/lang';

const OFFERS_EN = { symbol: 'It declares', region: 'Its regions are' };
const OFFERS_DE = { symbol: 'Sie deklariert', region: 'Ihre Regionen sind' };

/** Messages of the code diagram rules S100 to S104 and S600, in English and German. */
export const CODE_MESSAGES: Catalogue = {
  S100: {
    en: (v) =>
      `The card \`${v.id}\` names no file. Give it one with \`src=\`, relative to the diagram: \`source ${v.id} "Title" src="src/OrderService.java" symbol=placeOrder\`.`,
    de: (v) =>
      `Die Karte \`${v.id}\` nennt keine Datei. Sie bekommt eine mit \`src=\`, relativ zum Diagramm: \`source ${v.id} "Titel" src="src/OrderService.java" symbol=placeOrder\`.`,
  },
  S101: {
    en: (v) =>
      `The card \`${v.id}\` selects its lines in ${v.count} ways (${v.chosen}). Keep one: \`symbol=\` follows the code when it moves, \`region=\` next, \`lines=\` last.`,
    de: (v) =>
      `Die Karte \`${v.id}\` wählt ihre Zeilen auf ${v.count} Arten (${v.chosen}). Eine behalten: \`symbol=\` folgt dem Code, wenn er wandert, dann \`region=\`, zuletzt \`lines=\`.`,
  },
  S102: {
    en: (v) =>
      `The card \`${v.id}\`: \`${v.file}\` ${pick(v, { symbol: `declares no method or type \`${v.asked}\``, region: `marks no region \`${v.asked}\` with \`#region ${v.asked}\``, lines: `has no lines ${v.asked}` })}${v.case === 'lines' ? '.' : `${didYouMean(v.nearest, 'en')} ${pick(v, OFFERS_EN)}: ${v.found}.`} The file has ${v.last} lines.`,
    de: (v) =>
      `Die Karte \`${v.id}\`: \`${v.file}\` ${pick(v, { symbol: `deklariert keine Methode und keinen Typ \`${v.asked}\``, region: `markiert keine Region \`${v.asked}\` mit \`#region ${v.asked}\``, lines: `hat keine Zeilen ${v.asked}` })}${v.case === 'lines' ? '.' : `${didYouMean(v.nearest, 'de')} ${pick(v, OFFERS_DE)}: ${v.found}.`} Die Datei hat ${v.last} Zeilen.`,
  },
  S103: {
    en: (v) =>
      `The mark \`${v.range}\` lies outside the card \`${v.id}\`, which shows lines ${v.shown} of its file. Marks count the lines of the file, not of the card.`,
    de: (v) =>
      `Die Marke \`${v.range}\` liegt außerhalb der Karte \`${v.id}\`, die die Zeilen ${v.shown} ihrer Datei zeigt. Marken zählen die Zeilen der Datei, nicht der Karte.`,
  },
  S104: {
    en: (v) =>
      v.case === 'self'
        ? `The link from \`${v.id}\` points to its own card. A link leads from a call in one card to another card.`
        : `The link starts at line ${v.line}, which the card \`${v.id}\` does not show (lines ${v.shown} of its file). Name a line of the card, counted as in the file.`,
    de: (v) =>
      v.case === 'self'
        ? `Der Link von \`${v.id}\` zeigt auf seine eigene Karte. Ein Link führt von einem Aufruf in einer Karte zu einer anderen Karte.`
        : `Der Link beginnt in Zeile ${v.line}, die die Karte \`${v.id}\` nicht zeigt (Zeilen ${v.shown} ihrer Datei). Eine Zeile der Karte nennen, gezählt wie in der Datei.`,
  },
  S600: {
    en: (v) =>
      `The card \`${v.id}\` shows ${v.count} lines; at most ${v.most} stay readable in a picture. Select one method with \`symbol=\`, or zoom out with \`outline\`.`,
    de: (v) =>
      `Die Karte \`${v.id}\` zeigt ${v.count} Zeilen; lesbar bleiben im Bild höchstens ${v.most}. Mit \`symbol=\` eine Methode wählen oder mit \`outline\` herauszoomen.`,
  },
};
