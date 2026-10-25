import type { Locale } from '@diagrist/lang';
import type { FileProblem } from './io.js';

type Texts = Readonly<Record<Locale, (values: Readonly<Record<string, string>>) => string>>;

/** Names of the status lines and words; the table below phrases each in every locale. */
export type TextName =
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
  outside: {
    en: () =>
      'its real place lies outside the folder `dgr` runs in, through a link; a file a diagram names lies inside that folder, such as `use "../shared/base.dgr"` beside it',
    de: () =>
      'sein echter Ort liegt über einen Link außerhalb des Ordners, in dem `dgr` läuft; eine Datei, die ein Diagramm nennt, liegt in diesem Ordner, etwa `use "../shared/basis.dgr"` daneben',
  },
  tooLarge: {
    en: (v) =>
      `it is larger than ${v.max}, the most a file a diagram names may have; split it into smaller files that use each other`,
    de: (v) =>
      `sie ist größer als ${v.max}, das Höchstmaß für eine Datei, die ein Diagramm nennt; in kleinere Dateien teilen, die einander nutzen`,
  },
};

/** A status line or word of the human output in `locale`, filled with `values`. */
export function say(name: TextName, locale: Locale, values: Readonly<Record<string, string>> = {}): string {
  return TEXTS[name][locale](values);
}
