import type { Diagnostic } from './diagnostic.js';
import { didYouMean } from './list.js';

/** Every language Diagrist speaks: messages, picture texts, descriptions and `--locale` (ADR 0002 Nr. 5). */
export const LOCALES = ['en', 'de'] as const;

/** A language every catalogue has a message in; `formatDiagnostic` phrases each code in each of them. */
export type Locale = (typeof LOCALES)[number];

type Template = (values: Readonly<Record<string, string>>) => string;

/** Diagnostic codes of the language itself. Plugins register their own codes with their own prefix. */
export const LANG_CODES = {
  unterminatedString: 'L001',
  missingKeyword: 'L002',
  tabIndent: 'L003',
  duplicateAttribute: 'L004',
  missingHeader: 'L100',
  unknownKeyword: 'L101',
  missingArgument: 'L102',
  invalidValue: 'L103',
  unexpectedToken: 'L104',
  unknownAttribute: 'L105',
  noLinesHere: 'L106',
  unknownReference: 'L107',
  duplicateId: 'L108',
} as const;

type LangCode = (typeof LANG_CODES)[keyof typeof LANG_CODES];

/** One text per code and locale; the type makes a code without a text in every locale a compile error. */
const MESSAGES: Readonly<Record<LangCode, Readonly<Record<Locale, Template>>>> = {
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
  L100: {
    en: (v) =>
      `A diagram starts with \`diagram ${v.kind} "Title"\`.${v.allowed ? ` Registered kinds: ${v.allowed}. Example: \`${v.example}\`` : ''}`,
    de: (v) =>
      `Ein Diagramm beginnt mit \`diagram ${v.kind} "Titel"\`.${v.allowed ? ` Registrierte Arten: ${v.allowed}. Beispiel: \`${v.example}\`` : ''}`,
  },
  L101: {
    en: (v) => `Unknown keyword \`${v.found}\` here${didYouMean(v.suggestion, 'en')} Allowed: ${v.allowed}.`,
    de: (v) =>
      `Unbekanntes Schlüsselwort \`${v.found}\` an dieser Stelle${didYouMean(v.suggestion, 'de')} Erlaubt: ${v.allowed}.`,
  },
  L102: {
    en: (v) => `\`${v.statement}\` needs ${v.name}: ${v.expected}. Example: \`${v.example}\``,
    de: (v) => `\`${v.statement}\` braucht ${v.name}: ${v.expected}. Beispiel: \`${v.example}\``,
  },
  L103: {
    en: (v) => `\`${v.found}\` is not valid for ${v.name}; expected ${v.expected}.`,
    de: (v) => `\`${v.found}\` passt nicht zu ${v.name}; erwartet: ${v.expected}.`,
  },
  L104: {
    en: (v) =>
      `\`${v.found}\` is not expected in \`${v.statement}\`. Allowed after the arguments: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) =>
      `\`${v.found}\` ist in \`${v.statement}\` nicht vorgesehen. Erlaubt nach den Argumenten: ${v.allowed}. Beispiel: \`${v.example}\``,
  },
  L105: {
    en: (v) => `\`${v.statement}\` has no attribute \`${v.key}\`. Allowed: ${v.allowed}.`,
    de: (v) => `\`${v.statement}\` hat kein Attribut \`${v.key}\`. Erlaubt: ${v.allowed}.`,
  },
  L106: {
    en: (v) => `\`${v.statement}\` takes no indented lines without a keyword. Allowed child keywords: ${v.allowed}.`,
    de: (v) =>
      `\`${v.statement}\` erlaubt keine eingerückten Zeilen ohne Schlüsselwort. Erlaubte Schlüsselwörter: ${v.allowed}.`,
  },
  L107: {
    en: (v) => `\`${v.found}\` is not declared; ${v.name} must be ${v.expected}. Declared: ${v.known}.`,
    de: (v) => `\`${v.found}\` ist nicht deklariert; ${v.name} muss sein: ${v.expected}. Deklariert: ${v.known}.`,
  },
  L108: {
    en: (v) => `The id \`${v.found}\` is already declared in line ${v.first}. Ids are unique within a diagram.`,
    de: (v) => `Die Id \`${v.found}\` ist schon in Zeile ${v.first} deklariert. Ids sind je Diagramm eindeutig.`,
  },
  L004: {
    en: (v) => `Attribute ${v.key} is set twice; the last value wins.`,
    de: (v) => `Attribut ${v.key} ist doppelt gesetzt; der letzte Wert gilt.`,
  },
};

/** Renders a diagnostic of the language as text. A code that is not the language's own falls back to the code. */
export function formatDiagnostic(found: Diagnostic, locale: Locale = 'en'): string {
  return isLangCode(found.code) ? MESSAGES[found.code][locale](found.values) : found.code;
}

function isLangCode(code: string): code is LangCode {
  return Object.hasOwn(MESSAGES, code);
}
