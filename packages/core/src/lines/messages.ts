import type { Catalogue } from '../plugin.js';

/**
 * What an author can change when the layout drew a line badly: the order of the declarations, which the layout
 * starts from, or the size of the picture. The picture is drawn anyway.
 */
const ADVICE = {
  en: 'Try another order of the declarations or split the picture; it is drawn anyway.',
  de: 'Die Deklarationen anders ordnen oder das Bild teilen; gezeichnet wird es trotzdem.',
};

/** The same for a text on a line, which a shorter text often settles. */
const TEXT_ADVICE = {
  en: 'Shorten the text, try another order of the declarations or split the picture; it is drawn anyway.',
  de: 'Den Text kürzen, die Deklarationen anders ordnen oder das Bild teilen; gezeichnet wird es trotzdem.',
};

const THROUGH = {
  en: (v: Readonly<Record<string, string>>) =>
    v.case === 'own' ? `back through its own end \`${v.key}\`` : `through \`${v.key}\``,
  de: (v: Readonly<Record<string, string>>) =>
    v.case === 'own' ? `zurück durch das eigene Ende \`${v.key}\`` : `durch \`${v.key}\``,
};

const PORTS = {
  en: (v: Readonly<Record<string, string>>) =>
    v.case === 'spacing'
      ? `meet one side of \`${v.key}\` only ${v.value} px apart, less than ${v.limit} px, so they read as one`
      : `meet one side of \`${v.key}\` in an order that makes them cross right beside it`,
  de: (v: Readonly<Record<string, string>>) =>
    v.case === 'spacing'
      ? `treffen eine Seite von \`${v.key}\` nur ${v.value} px auseinander, weniger als ${v.limit} px, und wirken wie eine`
      : `treffen eine Seite von \`${v.key}\` in einer Reihenfolge, in der sie sich gleich daneben kreuzen`,
};

const LABEL = {
  en: (v: Readonly<Record<string, string>>) => {
    if (v.case === 'far')
      return `stands ${v.value} px from its line, more than ${v.limit} px, so it seems to belong to none`;
    if (v.case === 'near')
      return `stands closer to the line ${v.other} than ${v.limit} px, so it seems to belong to it`;
    return `lies on \`${v.key}\``;
  },
  de: (v: Readonly<Record<string, string>>) => {
    if (v.case === 'far')
      return `steht ${v.value} px von ihrer Linie, mehr als ${v.limit} px, und gehört scheinbar zu keiner`;
    if (v.case === 'near') return `steht näher als ${v.limit} px an der Linie ${v.other} und gehört scheinbar zu ihr`;
    return `liegt auf \`${v.key}\``;
  },
};

/**
 * The messages of the line check (ADR 0035): what the layout drew, what a presentable picture allows, and what the
 * author can change. Lines are named by their ends, as `a → b`.
 */
export const LINE_MESSAGES: Catalogue = {
  G410: {
    en: (v) => `The line ${v.line} crosses the line ${v.other}. ${ADVICE.en}`,
    de: (v) => `Die Linie ${v.line} kreuzt die Linie ${v.other}. ${ADVICE.de}`,
  },
  G411: {
    en: (v) =>
      `The line ${v.line} runs ${THROUGH.en(v)}; a line keeps ${v.limit} px clear of what it does not join. ${ADVICE.en}`,
    de: (v) =>
      `Die Linie ${v.line} läuft ${THROUGH.de(v)}; eine Linie hält ${v.limit} px Abstand zu allem, was sie nicht verbindet. ${ADVICE.de}`,
  },
  G412: {
    en: (v) =>
      `The line ${v.line} bends ${v.value} times, more than the ${v.limit} a reader follows at a glance. ${ADVICE.en}`,
    de: (v) =>
      `Die Linie ${v.line} knickt ${v.value}-mal ab, öfter als die ${v.limit}-mal, denen man auf einen Blick folgt. ${ADVICE.de}`,
  },
  G413: {
    en: (v) =>
      `The line ${v.line} runs only ${v.value} px straight into its end; its head needs ${v.limit} px to point the way. ${ADVICE.en}`,
    de: (v) =>
      `Die Linie ${v.line} läuft nur ${v.value} px gerade in ihr Ende; ihre Spitze braucht ${v.limit} px, um die Richtung zu zeigen. ${ADVICE.de}`,
  },
  G414: {
    en: (v) =>
      `The line ${v.line} bends ${v.value} px after its start, sooner than ${v.limit} px, so it seems to start elsewhere. ${ADVICE.en}`,
    de: (v) =>
      `Die Linie ${v.line} knickt ${v.value} px nach ihrem Anfang ab, früher als nach ${v.limit} px, und scheint woanders anzufangen. ${ADVICE.de}`,
  },
  G415: {
    en: (v) =>
      `The line ${v.line} jogs by ${v.value} px, less than ${v.limit} px, which reads as a slip, not a turn. ${ADVICE.en}`,
    de: (v) =>
      `Die Linie ${v.line} versetzt um ${v.value} px, weniger als ${v.limit} px; das wirkt wie ein Ausrutscher, nicht wie eine Kurve. ${ADVICE.de}`,
  },
  G416: {
    en: (v) =>
      `The lines ${v.line} and ${v.other} run side by side only ${v.value} px apart, less than ${v.limit} px, so they read as one. ${ADVICE.en}`,
    de: (v) =>
      `Die Linien ${v.line} und ${v.other} laufen nur ${v.value} px nebeneinander, weniger als ${v.limit} px, und wirken wie eine. ${ADVICE.de}`,
  },
  G417: {
    en: (v) => `The lines ${v.line} and ${v.other} ${PORTS.en(v)}. ${ADVICE.en}`,
    de: (v) => `Die Linien ${v.line} und ${v.other} ${PORTS.de(v)}. ${ADVICE.de}`,
  },
  G418: {
    en: (v) => `The text of the line ${v.line} ${LABEL.en(v)}. ${TEXT_ADVICE.en}`,
    de: (v) => `Der Text der Linie ${v.line} ${LABEL.de(v)}. ${TEXT_ADVICE.de}`,
  },
};
