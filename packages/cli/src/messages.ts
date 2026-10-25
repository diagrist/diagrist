import { type Locale, didYouMean as suggest } from '@diagrist/lang';

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
  | 'unrenderable'
  | 'unknownVariant'
  | 'outWithPictures'
  | 'unreadableNeed';

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
  unknownVariant: {
    code: 'C016',
    en: (v) => `\`${v.found}\` is no variant of \`${v.file}\`. Variants: ${v.allowed}. Example: \`${v.example}\``,
    de: (v) =>
      `\`${v.found}\` ist keine Variante von \`${v.file}\`. Varianten: ${v.allowed}. Beispiel: \`${v.example}\``,
  },
  outWithPictures: {
    code: 'C017',
    en: (v) =>
      `\`-o\` names one file, but \`${v.file}\` has ${v.count} pictures (the base and ${v.allowed}). Build one with \`--variant\`, or leave \`-o\` out and the pictures go next to the source. Example: \`${v.example}\``,
    de: (v) =>
      `\`-o\` nennt eine Datei, aber \`${v.file}\` hat ${v.count} Bilder (die Basis und ${v.allowed}). Eines mit \`--variant\` bauen oder \`-o\` weglassen, dann landen die Bilder neben der Quelle. Beispiel: \`${v.example}\``,
  },
  unreadableNeed: {
    code: 'C018',
    en: (v) => `Cannot read \`${v.file}\`, named in line ${v.line} of \`${v.source}\`: ${v.reason}.`,
    de: (v) => `\`${v.file}\`, genannt in Zeile ${v.line} von \`${v.source}\`, lässt sich nicht lesen: ${v.reason}.`,
  },
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
