import type { Locale, Template } from '../messages.js';

type VariantCode =
  | 'L109'
  | 'L110'
  | 'L111'
  | 'L112'
  | 'L113'
  | 'L114'
  | 'L115'
  | 'L116'
  | 'L117'
  | 'L118'
  | 'L119'
  | 'L120';

const PATH_PROBLEMS: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en: {
    absolute: 'it is absolute or names a scheme',
    outside: 'it leaves the folder `dgr` runs in',
    hidden: 'it names a hidden file or folder',
  },
  de: {
    absolute: 'er ist absolut oder nennt ein Schema',
    outside: 'er verlässt den Ordner, in dem `dgr` läuft',
    hidden: 'er nennt eine versteckte Datei oder einen versteckten Ordner',
  },
};

/** The texts of the codes `use`, `variant`, `set`, `drop` and file paths report (ADR 0021), in every locale. */
export const VARIANT_MESSAGES: Readonly<Record<VariantCode, Readonly<Record<Locale, Template>>>> = {
  L109: {
    en: (v) =>
      `\`use\` stands directly after the header, before \`${v.found}\` in line ${v.line}. Example: \`use "base.dgr"\``,
    de: (v) =>
      `\`use\` steht direkt nach dem Kopf, vor \`${v.found}\` in Zeile ${v.line}. Beispiel: \`use "basis.dgr"\``,
  },
  L110: {
    en: (v) =>
      `\`${v.file}\` is a \`${v.found}\` diagram; \`use\` in a \`${v.kind}\` diagram needs a \`${v.kind}\` diagram.`,
    de: (v) =>
      `\`${v.file}\` ist ein \`${v.found}\`-Diagramm; \`use\` in einem \`${v.kind}\`-Diagramm braucht ein \`${v.kind}\`-Diagramm.`,
  },
  L111: {
    en: (v) => `\`${v.file}\` uses itself through ${v.chain}. Remove one \`use\`.`,
    de: (v) => `\`${v.file}\` nutzt sich selbst über ${v.chain}. Ein \`use\` entfernen.`,
  },
  L112: {
    en: (v) =>
      `\`drop ${v.found}\` matches no line of the picture \`${v.variant}\` builds on. Lines with keyword \`${v.keyword}\`: ${v.known}. Example: \`${v.example}\``,
    de: (v) =>
      `\`drop ${v.found}\` trifft keine Zeile des Bildes, auf dem \`${v.variant}\` aufbaut. Zeilen mit \`${v.keyword}\`: ${v.known}. Beispiel: \`${v.example}\``,
  },
  L113: {
    en: (v) =>
      `\`drop ${v.found}\` matches the lines ${v.lines}. Add arguments until exactly one matches, for example \`${v.example}\`.`,
    de: (v) =>
      `\`drop ${v.found}\` trifft die Zeilen ${v.lines}. Argumente ergänzen, bis genau eine passt, etwa \`${v.example}\`.`,
  },
  L114: {
    en: (v) =>
      `\`${v.id}\` is dropped in variant \`${v.variant}\`, but ${v.name} of this line still refers to it. Drop this line too, or keep \`${v.id}\`.`,
    de: (v) =>
      `\`${v.id}\` entfällt in der Variante \`${v.variant}\`, aber ${v.name} dieser Zeile verweist noch darauf. Die Zeile auch entfernen oder \`${v.id}\` behalten.`,
  },
  L115: {
    en: (v) =>
      `\`set ${v.id}\` changes nothing. Write at least one attribute, clause or flag of \`${v.keyword}\`: ${v.allowed}. Example: \`set ${v.id} ${v.example}\``,
    de: (v) =>
      `\`set ${v.id}\` ändert nichts. Mindestens ein Attribut, eine Klausel oder ein Flag von \`${v.keyword}\` angeben: ${v.allowed}. Beispiel: \`set ${v.id} ${v.example}\``,
  },
  L116: {
    en: (v) =>
      `\`variant ${v.found}\` builds on \`${v.from}\`, which is declared later in line ${v.line}. Declare \`${v.from}\` first.`,
    de: (v) =>
      `\`variant ${v.found}\` baut auf \`${v.from}\` auf, das erst später in Zeile ${v.line} deklariert ist. \`${v.from}\` zuerst deklarieren.`,
  },
  L117: {
    en: (v) =>
      `\`${v.found}\` is already declared in line ${v.first}. In a variant, change it with \`set ${v.found} ...\` or remove it with \`drop ${v.keyword} ${v.found}\`.`,
    de: (v) =>
      `\`${v.found}\` ist schon in Zeile ${v.first} deklariert. In einer Variante mit \`set ${v.found} ...\` ändern oder mit \`drop ${v.keyword} ${v.found}\` entfernen.`,
  },
  L118: {
    en: (v) =>
      `\`${v.file}\` was not handed over, so it cannot be read. Hosts read every file a diagram needs before they compile it; \`dgr\` does so and reports C018 when it cannot.`,
    de: (v) =>
      `\`${v.file}\` wurde nicht übergeben und lässt sich nicht lesen. Hosts lesen jede Datei, die ein Diagramm braucht, vor dem Kompilieren; \`dgr\` tut das und meldet C018, wenn es nicht geht.`,
  },
  L119: {
    en: (v) =>
      `\`${v.found}\` is no allowed path: ${PATH_PROBLEMS.en[v.case ?? ''] ?? v.case}. A path is relative to the diagram, stays inside the folder \`dgr\` runs in and names no hidden file or folder. Example: \`"../shared/base.dgr"\``,
    de: (v) =>
      `\`${v.found}\` ist kein erlaubter Pfad: ${PATH_PROBLEMS.de[v.case ?? ''] ?? v.case}. Ein Pfad gilt relativ zum Diagramm, bleibt im Ordner, in dem \`dgr\` läuft, und nennt keine versteckte Datei und keinen versteckten Ordner. Beispiel: \`"../shared/basis.dgr"\``,
  },
  L120: {
    en: (v) =>
      `\`${v.file}\` would be the ${v.depth}th file in a chain of \`use\`, and a chain holds at most ${v.max}. Use the file that holds the lines directly, such as \`use "../shared/base.dgr"\`.`,
    de: (v) =>
      `\`${v.file}\` wäre die ${v.depth}. Datei einer Kette von \`use\`, und eine Kette hat höchstens ${v.max}. Die Datei mit den Zeilen direkt nutzen, etwa \`use "../shared/basis.dgr"\`.`,
  },
};
