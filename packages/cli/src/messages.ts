import type { Locale } from '@diagrist/lang';
import type { FileProblem } from './io.js';

type Template = (values: Readonly<Record<string, string>>) => string;
type Texts = Readonly<Record<Locale, Template>>;

/** Names of the refusals; the table below must phrase each of them in every locale. */
export type ProblemName =
  | 'unknownCommand'
  | 'unknownOption'
  | 'missingArgument'
  | 'extraArgument'
  | 'missingValue'
  | 'unexpectedValue'
  | 'invalidChoice'
  | 'unreadable'
  | 'unwritable'
  | 'noEngine'
  | 'unknownKind'
  | 'commandFirst';

type TextName =
  | 'formatted'
  | 'unformatted'
  | 'invalid'
  | 'allFormatted'
  | 'wrote'
  | 'noFindings'
  | 'error'
  | 'warning'
  | FileProblem;

/** The locales of all messages; `--locale` offers exactly these. */
export const LOCALES: readonly Locale[] = ['en', 'de'];

const suggest = (v: Readonly<Record<string, string>>, locale: Locale): string =>
  v.suggestion
    ? locale === 'de'
      ? `; gemeint ist wohl \`${v.suggestion}\`?`
      : `; did you mean \`${v.suggestion}\`?`
    : '.';

/**
 * Why a call cannot be carried out (exit code 2). Each message says what was found, what is allowed and gives
 * an example of a correct call (ADR 0005). The codes are stable for tools; the texts may improve.
 */
const PROBLEMS: Readonly<Record<ProblemName, Texts & { readonly code: string }>> = {
  unknownCommand: {
    code: 'C001',
    en: (v) => `Unknown command \`${v.found}\`${suggest(v, 'en')} Commands: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) => `Unbekannter Befehl \`${v.found}\`${suggest(v, 'de')} Befehle: ${v.allowed}. Beispiel: \`${v.example}\``,
  },
  unknownOption: {
    code: 'C002',
    en: (v) =>
      `\`${v.command}\` has no option \`${v.found}\`${suggest(v, 'en')} Allowed: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) =>
      `\`${v.command}\` hat keine Option \`${v.found}\`${suggest(v, 'de')} Erlaubt: ${v.allowed}. Beispiel: \`${v.example}\``,
  },
  missingArgument: {
    code: 'C003',
    en: (v) => `\`${v.command}\` needs ${v.name}: ${v.doc} Example: \`${v.example}\``,
    de: (v) => `\`${v.command}\` braucht ${v.name}: ${v.doc} Beispiel: \`${v.example}\``,
  },
  extraArgument: {
    code: 'C004',
    en: (v) => `\`${v.command}\` takes ${v.usage}, not also \`${v.found}\`. Example: \`${v.example}\``,
    de: (v) => `\`${v.command}\` nimmt ${v.usage}, nicht zusätzlich \`${v.found}\`. Beispiel: \`${v.example}\``,
  },
  missingValue: {
    code: 'C005',
    en: (v) => `\`${v.option}\` needs a value: ${v.value}. Example: \`${v.example}\``,
    de: (v) => `\`${v.option}\` braucht einen Wert: ${v.value}. Beispiel: \`${v.example}\``,
  },
  unexpectedValue: {
    code: 'C006',
    en: (v) => `\`${v.option}\` is a switch and takes no value; write \`${v.option}\` alone. Example: \`${v.example}\``,
    de: (v) => `\`${v.option}\` ist ein Schalter ohne Wert; nur \`${v.option}\` schreiben. Beispiel: \`${v.example}\``,
  },
  invalidChoice: {
    code: 'C007',
    en: (v) => `\`${v.found}\` is not allowed for \`${v.option}\`. Allowed: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) =>
      `\`${v.found}\` ist für \`${v.option}\` nicht erlaubt. Erlaubt: ${v.allowed}. Beispiel: \`${v.example}\``,
  },
  unreadable: {
    code: 'C008',
    en: (v) => `Cannot read \`${v.file}\`: ${v.reason}.`,
    de: (v) => `\`${v.file}\` lässt sich nicht lesen: ${v.reason}.`,
  },
  unwritable: {
    code: 'C009',
    en: (v) => `Cannot write \`${v.file}\`: ${v.reason}.`,
    de: (v) => `\`${v.file}\` lässt sich nicht schreiben: ${v.reason}.`,
  },
  noEngine: {
    code: 'C010',
    en: (v) =>
      `\`dgr ${v.command}\` needs diagram kind support, and kind support arrives with @diagrist/core. Until then this build formats only. Example: \`${v.example}\``,
    de: (v) =>
      `\`dgr ${v.command}\` braucht die Unterstützung der Diagrammarten, und die kommt mit @diagrist/core. Bis dahin formatiert dieser Build nur. Beispiel: \`${v.example}\``,
  },
  unknownKind: {
    code: 'C011',
    en: (v) => `Unknown diagram kind \`${v.found}\`${suggest(v, 'en')} Kinds: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) =>
      `Unbekannte Diagrammart \`${v.found}\`${suggest(v, 'de')} Arten: ${v.allowed}. Beispiel: \`${v.example}\``,
  },
  commandFirst: {
    code: 'C012',
    en: (v) => `The command comes first, before any option: \`dgr ${v.found} …\`. Example: \`dgr help\``,
    de: (v) => `Der Befehl steht vorn, vor allen Optionen: \`dgr ${v.found} …\`. Beispiel: \`dgr help\``,
  },
};

/** Status lines of the human output. They carry no code: `--json` reports the same facts as fields. */
const TEXTS: Readonly<Record<TextName, Texts>> = {
  formatted: { en: (v) => `formatted ${v.file}`, de: (v) => `formatiert: ${v.file}` },
  unformatted: { en: (v) => `not formatted: ${v.file}`, de: (v) => `nicht formatiert: ${v.file}` },
  invalid: {
    en: (v) => `left unchanged because of errors: ${v.file}`,
    de: (v) => `wegen Fehlern unverändert: ${v.file}`,
  },
  allFormatted: {
    en: (v) => `already formatted: ${v.count} of ${v.count} files`,
    de: (v) => `bereits formatiert: ${v.count} von ${v.count} Dateien`,
  },
  wrote: { en: (v) => `wrote ${v.file}`, de: (v) => `geschrieben: ${v.file}` },
  noFindings: { en: (v) => `${v.file}: no findings`, de: (v) => `${v.file}: keine Befunde` },
  error: { en: () => 'error', de: () => 'Fehler' },
  warning: { en: () => 'warning', de: () => 'Warnung' },
  missing: { en: () => 'no such file', de: () => 'Datei nicht gefunden' },
  directory: { en: () => 'it is a directory', de: () => 'das ist ein Verzeichnis' },
  denied: { en: () => 'permission denied', de: () => 'keine Berechtigung' },
  failed: { en: () => 'the system refused', de: () => 'das System hat abgelehnt' },
};

/** A call that cannot be carried out, as data: the name selects the message, the values fill it. */
export interface Problem {
  readonly problem: ProblemName;
  readonly values: Readonly<Record<string, string>>;
}

export function problem(name: ProblemName, values: Readonly<Record<string, string>> = {}): Problem {
  return { problem: name, values };
}

export function codeOf(found: Problem): string {
  return PROBLEMS[found.problem].code;
}

export function formatProblem(found: Problem, locale: Locale): string {
  return PROBLEMS[found.problem][locale](found.values);
}

export function say(name: TextName, locale: Locale, values: Readonly<Record<string, string>> = {}): string {
  return TEXTS[name][locale](values);
}

/** Items as an inline code list, `a`, `b`, the way the language's own diagnostics list what is allowed. */
export function list(items: readonly string[]): string {
  return items.map((item) => `\`${item}\``).join(', ');
}
