import { type Diagnostic, formatDiagnostic, type Locale } from '@diagrist/lang';
import type { Catalogue, Plugin } from './plugin.js';

/** Diagnostic codes of the kernel itself. */
export const KERNEL_CODES: {
  readonly unknownKind: 'K100';
  readonly duplicateKind: 'K101';
  readonly unknownIcon: 'K102';
  readonly overlap: 'G400';
  readonly outside: 'G401';
  readonly overflow: 'G402';
} = {
  unknownKind: 'K100',
  duplicateKind: 'K101',
  unknownIcon: 'K102',
  overlap: 'G400',
  outside: 'G401',
  overflow: 'G402',
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
  K102: {
    en: (v) => `The picture uses the icon \`${v.icon}\`, which the style table does not have. Icons: ${v.known}.`,
    de: (v) => `Das Bild nutzt das Icon \`${v.icon}\`, das die Stiltabelle nicht hat. Icons: ${v.known}.`,
  },
};

/** Renders any diagnostic as text: kernel and plugin codes from their catalogues, the rest through `lang`. */
export function formatMessage(found: Diagnostic, plugins: readonly Plugin[], locale: Locale = 'en'): string {
  const template = [KERNEL, ...plugins.map((p) => p.messages)].find((catalogue) => found.code in catalogue)?.[
    found.code
  ];
  return template ? template[locale](found.values) : formatDiagnostic(found, locale);
}
