import type { Catalogue } from '@diagrist/core';

/** Messages of the use case warnings U920 to U927 (the predecessor's W420 to W427), in English and German. */
export const USECASE_WARNINGS: Catalogue = {
  U920: {
    en: (v) => `The use case "${v.label}" lies outside every subject. Add \`in ${v.subject}\` to its line.`,
    de: (v) => `Der Anwendungsfall „${v.label}“ liegt außerhalb jeder Systemgrenze. \`in ${v.subject}\` ergänzen.`,
  },
  U921: {
    en: (v) =>
      `No actor takes part in the use case "${v.label}". Add \`rel actor -- ${v.id}\`, or reach it through \`include\` or \`extend\`.`,
    de: (v) =>
      `Am Anwendungsfall „${v.label}“ ist kein Akteur beteiligt. \`rel akteur -- ${v.id}\` ergänzen oder ihn per \`include\` oder \`extend\` anbinden.`,
  },
  U922: {
    en: (v) =>
      v.case === 'condition'
        ? `\`${v.relation}\` has no condition. Write when the extension applies: \`when="..."\`.`
        : `\`${v.relation}\` names no extension point. Write where it applies: \`at="${v.point}"\`.`,
    de: (v) =>
      v.case === 'condition'
        ? `\`${v.relation}\` hat keine Bedingung. Angeben, wann die Erweiterung greift: \`when="..."\`.`
        : `\`${v.relation}\` nennt keine Erweiterungsstelle. Angeben, wo sie greift: \`at="${v.point}"\`.`,
  },
  U923: {
    en: (v) =>
      v.case === 'none'
        ? 'The diagram has no actor. Add who uses the system: `actor customer "Customer"`.'
        : `The actor "${v.label}" takes part in no use case. Add \`rel ${v.id} -- case\`.`,
    de: (v) =>
      v.case === 'none'
        ? 'Das Diagramm hat keinen Akteur. Ergänzen, wer das System nutzt: `actor kunde "Kunde"`.'
        : `Der Akteur „${v.label}“ ist an keinem Anwendungsfall beteiligt. \`rel ${v.id} -- fall\` ergänzen.`,
  },
  U924: {
    en: (v) =>
      `\`${v.a}\` and \`${v.b}\` are joined by both \`include\` and \`extend\`. \`include\` is always part of the flow, \`extend\` only under a condition: choose one.`,
    de: (v) =>
      `\`${v.a}\` und \`${v.b}\` sind mit \`include\` und \`extend\` verbunden. \`include\` gehört immer zum Ablauf, \`extend\` nur unter einer Bedingung: eines wählen.`,
  },
  U926: {
    en: (v) =>
      `The subject "${v.label}" holds no use case. Add \`usecase id "Goal" in ${v.id}\` or remove the subject.`,
    de: (v) =>
      `Die Systemgrenze „${v.label}“ enthält keinen Anwendungsfall. \`usecase id "Ziel" in ${v.id}\` ergänzen oder die Grenze entfernen.`,
  },
  U927: {
    en: (v) => `\`direction=${v.direction}\` has no effect: the diagram has fewer than two subjects. Leave it out.`,
    de: (v) => `\`direction=${v.direction}\` wirkt nicht: das Diagramm hat weniger als zwei Systemgrenzen. Weglassen.`,
  },
};
