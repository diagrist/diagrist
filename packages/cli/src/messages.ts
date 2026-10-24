import { type Locale, didYouMean as suggest } from '@diagrist/lang';
import type { Finding } from './engine.js';
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
  | 'unknownKind'
  | 'commandFirst'
  | 'invalidScale'
  | 'scaleWithoutPng'
  | 'unrenderable';

type TextName =
  | 'formatted'
  | 'unformatted'
  | 'invalid'
  | 'allFormatted'
  | 'wrote'
  | 'noFindings'
  | 'watching'
  | 'changed'
  | 'error'
  | 'warning'
  | FileProblem;

/**
 * Why a call cannot be carried out (exit code 2). Each message says what was found, what is allowed and gives
 * an example of a correct call (ADR 0005). The codes are stable for tools; the texts may improve. A code is
 * never reused: C010 was the refusal of a build without the kernel and is retired.
 */
const PROBLEMS: Readonly<Record<ProblemName, Texts & { readonly code: string }>> = {
  unknownCommand: {
    code: 'C001',
    en: (v) =>
      `Unknown command \`${v.found}\`${suggest(v.suggestion, 'en')} Commands: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) =>
      `Unbekannter Befehl \`${v.found}\`${suggest(v.suggestion, 'de')} Befehle: ${v.allowed}. Beispiel: \`${v.example}\``,
  },
  unknownOption: {
    code: 'C002',
    en: (v) =>
      `\`${v.command}\` has no option \`${v.found}\`${suggest(v.suggestion, 'en')} Allowed: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) =>
      `\`${v.command}\` hat keine Option \`${v.found}\`${suggest(v.suggestion, 'de')} Erlaubt: ${v.allowed}. Beispiel: \`${v.example}\``,
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
  unknownKind: {
    code: 'C011',
    en: (v) =>
      `Unknown diagram kind \`${v.found}\`${suggest(v.suggestion, 'en')} Kinds: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) =>
      `Unbekannte Diagrammart \`${v.found}\`${suggest(v.suggestion, 'de')} Arten: ${v.allowed}. Beispiel: \`${v.example}\``,
  },
  commandFirst: {
    code: 'C012',
    en: (v) => `The command comes first, before any option: \`dgr ${v.found} …\`. Example: \`dgr help\``,
    de: (v) => `Der Befehl steht vorn, vor allen Optionen: \`dgr ${v.found} …\`. Beispiel: \`dgr help\``,
  },
  invalidScale: {
    code: 'C013',
    en: (v) =>
      `\`--scale ${v.found}\` is not a factor from ${v.min} to ${v.max}; 2 doubles width and height. Example: \`${v.example}\``,
    de: (v) =>
      `\`--scale ${v.found}\` ist kein Faktor von ${v.min} bis ${v.max}; 2 verdoppelt Breite und Höhe. Beispiel: \`${v.example}\``,
  },
  scaleWithoutPng: {
    code: 'C014',
    en: (v) => `\`--scale\` sizes the PNG, so it needs \`--png\`; the SVG has no pixels. Example: \`${v.example}\``,
    de: (v) =>
      `\`--scale\` bestimmt die Größe des PNG und braucht deshalb \`--png\`; das SVG hat keine Pixel. Beispiel: \`${v.example}\``,
  },
  unrenderable: {
    code: 'C015',
    en: (v) =>
      `Cannot render \`${v.file}\` as PNG (${v.problem}: ${v.detail}), so nothing was written. Without \`--png\` the SVG is still built: \`${v.example}\``,
    de: (v) =>
      `\`${v.file}\` lässt sich nicht als PNG zeichnen (${v.problem}: ${v.detail}), daher wurde nichts geschrieben. Ohne \`--png\` entsteht das SVG trotzdem: \`${v.example}\``,
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
  watching: { en: (v) => `watching ${v.file}, Ctrl+C ends`, de: (v) => `beobachte ${v.file}, Strg+C beendet` },
  changed: { en: (v) => `changed ${v.file}`, de: (v) => `geändert: ${v.file}` },
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

/** Last day the old extension `.dia` is read: one year after ADR 0002, see ADR 0012. */
export const LEGACY_EXTENSION_UNTIL = '2027-10-24';

const LEGACY: Texts = {
  en: (v) =>
    `\`${v.file}\` has the old extension \`.dia\`, which is read until ${v.until} only. Rename it to \`${v.renamed}\`.`,
  de: (v) =>
    `\`${v.file}\` hat die alte Endung \`.dia\`, die nur bis ${v.until} gelesen wird. In \`${v.renamed}\` umbenennen.`,
};

/**
 * The notice ADR 0002 Nr. 6 promises for a `.dia` file: a warning C100 on the file, so the call still succeeds.
 * The code stands for the file, not for a line, and is stable like the refusal codes.
 */
export function legacyExtension(file: string, locale: Locale): Finding {
  const values = { file, renamed: `${file.slice(0, -'.dia'.length)}.dgr`, until: LEGACY_EXTENSION_UNTIL };
  const span = { line: 1, column: 1, length: 0 };
  return { code: 'C100', severity: 'warning', span, values, message: LEGACY[locale](values) };
}
