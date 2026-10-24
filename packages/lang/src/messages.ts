import type { Diagnostic } from './diagnostic.js';

export type Locale = 'en' | 'de';

type Template = (values: Readonly<Record<string, string>>) => string;

/** Diagnostic codes of the language itself. Plugins register their own codes with their own prefix. */
export const LANG_CODES = {
  unterminatedString: 'L001',
  missingKeyword: 'L002',
  tabIndent: 'L003',
  duplicateAttribute: 'L004',
} as const;

const MESSAGES: Readonly<Record<string, Readonly<Record<Locale, Template>>>> = {
  L001: {
    en: () => 'Text is missing its closing quote.',
    de: () => 'Dem Text fehlt das schließende Anführungszeichen.',
  },
  L002: {
    en: (v) => `A line starts with a keyword, not with ${v.found}.`,
    de: (v) => `Eine Zeile beginnt mit einem Schlüsselwort, nicht mit ${v.found}.`,
  },
  L003: {
    en: () => 'Indent with spaces, not tabs.',
    de: () => 'Mit Leerzeichen einrücken, nicht mit Tabs.',
  },
  L004: {
    en: (v) => `Attribute ${v.key} is set twice; the last value wins.`,
    de: (v) => `Attribut ${v.key} ist doppelt gesetzt; der letzte Wert gilt.`,
  },
};

/** Renders a diagnostic as text. Unknown codes fall back to the code itself. */
export function formatDiagnostic(found: Diagnostic, locale: Locale = 'en'): string {
  return MESSAGES[found.code]?.[locale](found.values) ?? found.code;
}
