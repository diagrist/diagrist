import { type Diagnostic, formatDiagnostic, type Locale } from '@diagrist/lang';
import type { Catalogue, Plugin } from './plugin.js';

/** Diagnostic codes of the kernel itself. */
export const KERNEL_CODES: { readonly unknownKind: 'K100'; readonly duplicateKind: 'K101' } = {
  unknownKind: 'K100',
  duplicateKind: 'K101',
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
};

/** Renders any diagnostic as text: kernel and plugin codes from their catalogues, the rest through `lang`. */
export function formatMessage(found: Diagnostic, plugins: readonly Plugin[], locale: Locale = 'en'): string {
  const template = [KERNEL, ...plugins.map((p) => p.messages)].find((catalogue) => found.code in catalogue)?.[
    found.code
  ];
  return template ? template[locale](found.values) : formatDiagnostic(found, locale);
}
