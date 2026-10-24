import type { Catalogue } from '@diagrist/core';

/** Messages of the warnings, in English and German. */
export const WARNINGS: Catalogue = {
  A710: {
    en: (v) =>
      `The edge \`${v.from}\` to \`${v.to}\` says nothing. Give it a verb or a protocol, e.g. \`"reads" via=HTTPS\`.`,
    de: (v) =>
      `Die Kante \`${v.from}\` zu \`${v.to}\` sagt nichts. Ein Verb oder ein Protokoll angeben, etwa \`"liest" via=HTTPS\`.`,
  },
  A801: {
    en: (v) =>
      `The decision \`${v.id}\` has no mark in the picture. Put \`mark=${v.id}\` on the element or step it is about.`,
    de: (v) =>
      `Die Entscheidung \`${v.id}\` hat keine Marke im Bild. \`mark=${v.id}\` an das Element oder den Schritt setzen, um den es geht.`,
  },
};
