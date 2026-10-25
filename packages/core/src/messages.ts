import { type Diagnostic, formatDiagnostic, type Locale } from '@diagrist/lang';
import type { Catalogue, Plugin } from './plugin.js';

/** Diagnostic codes of the kernel itself. */
export const KERNEL_CODES: {
  readonly unknownKind: 'K100';
  readonly duplicateKind: 'K101';
  readonly unknownIcon: 'K102';
  readonly kindFailed: 'K110';
  readonly noDiff: 'K103';
  readonly overlap: 'G400';
  readonly outside: 'G401';
  readonly overflow: 'G402';
  readonly foreign: 'G403';
} = {
  unknownKind: 'K100',
  duplicateKind: 'K101',
  unknownIcon: 'K102',
  kindFailed: 'K110',
  noDiff: 'K103',
  overlap: 'G400',
  outside: 'G401',
  overflow: 'G402',
  foreign: 'G403',
};

const OVERLAP: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: { boxes: 'overlaps the box', texts: 'overlaps the text', covered: 'lies on the box' },
  de: { boxes: 'überlappt den Kasten', texts: 'überlappt den Text', covered: 'liegt auf dem Kasten' },
};

const KERNEL: Catalogue = {
  K100: {
    en: (v) =>
      `No plugin draws the diagram kind \`${v.found}\`. Registered kinds: ${v.allowed}. A diagram starts with \`diagram <kind> "Title"\`.`,
    de: (v) =>
      `Kein Plugin zeichnet die Diagrammart \`${v.found}\`. Registrierte Arten: ${v.allowed}. Ein Diagramm beginnt mit \`diagram <Art> "Titel"\`.`,
  },
  K101: {
    en: (v) => `The kind \`${v.kind}\` is registered twice, by ${v.plugins}; the first one is used.`,
    de: (v) => `Die Art \`${v.kind}\` ist doppelt registriert, von ${v.plugins}; die erste gilt.`,
  },
  G400: {
    en: (v) =>
      `\`${v.first}\` ${OVERLAP.en[v.case ?? ''] ?? 'overlaps'} \`${v.second}\`. Shorten a text, or change what the layout places here.`,
    de: (v) =>
      `\`${v.first}\` ${OVERLAP.de[v.case ?? ''] ?? 'überlappt'} \`${v.second}\`. Einen Text kürzen oder ändern, was das Layout hier platziert.`,
  },
  G401: {
    en: (v) => `\`${v.key}\` reaches outside the picture.`,
    de: (v) => `\`${v.key}\` ragt aus dem Bild.`,
  },
  G402: {
    en: (v) => `\`${v.key}\` does not fit into \`${v.within}\`. Shorten the text or give \`${v.within}\` more room.`,
    de: (v) => `\`${v.key}\` passt nicht in \`${v.within}\`. Den Text kürzen oder \`${v.within}\` mehr Platz geben.`,
  },
  G403: {
    en: (v) =>
      `\`${v.key}\` reaches into the frame \`${v.frame}\` without belonging to it, so the picture says it is part of it. Make \`${v.key}\` a member of \`${v.frame}\`, or split the frame.`,
    de: (v) =>
      `\`${v.key}\` ragt in den Rahmen \`${v.frame}\`, ohne dazuzugehören; das Bild sagt also, es sei ein Teil davon. \`${v.key}\` zum Mitglied von \`${v.frame}\` machen oder den Rahmen teilen.`,
  },
  K110: {
    en: (v) =>
      `The plugin \`${v.plugin}\` failed while drawing the kind \`${v.kind}\`: ${v.error}. This is a bug, not a mistake in the diagram; please report it with the diagram at https://github.com/diagrist/diagrist/issues.`,
    de: (v) =>
      `Das Plugin \`${v.plugin}\` ist beim Zeichnen der Art \`${v.kind}\` gescheitert: ${v.error}. Das ist ein Programmfehler, kein Fehler im Diagramm; bitte mit dem Diagramm melden unter https://github.com/diagrist/diagrist/issues.`,
  },
  K103: {
    en: (v) =>
      `The kind \`${v.kind}\` draws no diff pictures; remove \`diff\` from \`variant ${v.variant}\`. Kinds with diff pictures: ${v.allowed}.`,
    de: (v) =>
      `Die Art \`${v.kind}\` zeichnet keine Vergleichsbilder; \`diff\` aus \`variant ${v.variant}\` entfernen. Arten mit Vergleichsbild: ${v.allowed}.`,
  },
  K102: {
    en: (v) => `The picture uses the icon \`${v.icon}\`, which the style table does not have. Icons: ${v.known}.`,
    de: (v) => `Das Bild nutzt das Icon \`${v.icon}\`, das die Stiltabelle nicht hat. Icons: ${v.known}.`,
  },
};

/**
 * The text a message template writes for the case a finding names in `values.case`, so the finding carries its case
 * as data, not as prose; an unknown case is written as it is.
 */
export function pick(values: Readonly<Record<string, string>>, cases: Readonly<Record<string, string>>): string {
  return cases[values.case ?? ''] ?? values.case ?? '';
}

/** Renders any diagnostic as text: kernel and plugin codes from their catalogues, the rest through `lang`. */
export function formatMessage(found: Diagnostic, plugins: readonly Plugin[], locale: Locale = 'en'): string {
  const template = [KERNEL, ...plugins.map((p) => p.messages)].find((catalogue) => found.code in catalogue)?.[
    found.code
  ];
  return template ? template[locale](found.values) : formatDiagnostic(found, locale);
}
