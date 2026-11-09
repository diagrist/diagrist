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
  | 'metrics'
  | 'watching'
  | 'changed'
  | 'error'
  | 'warning'
  | 'figjamLost'
  | 'figjamNext'
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
  metrics: {
    en: (v) =>
      `${v.picture}: ${v.lines} lines, ${v.crossings} crossings, ${v.overlaps} stretches on one another, ${v.bends} bends (at most ${v.maxBends} on one line, ${v.avoidable} avoidable), ${v.length} px of line, ${v.width} × ${v.height} px (${v.aspect} : 1)`,
    de: (v) =>
      `${v.picture}: ${v.lines} Linien, ${v.crossings} Kreuzungen, ${v.overlaps} Strecken aufeinander, ${v.bends} Knicke (höchstens ${v.maxBends} an einer Linie, ${v.avoidable} vermeidbar), ${v.length} px Linie, ${v.width} × ${v.height} px (${v.aspect} : 1)`,
  },
  watching: { en: (v) => `watching ${v.file}, Ctrl+C ends`, de: (v) => `beobachte ${v.file}, Strg+C beendet` },
  changed: { en: (v) => `changed ${v.file}`, de: (v) => `geändert: ${v.file}` },
  figjamLost: {
    en: (v) =>
      `${v.file}: FigJam's import drops ${v.filters} filters (the stripes of areas=stripe) and ${v.spacing} letter spacings`,
    de: (v) =>
      `${v.file}: der Import von FigJam verwirft ${v.filters} Filter (die Streifen von areas=stripe) und ${v.spacing} Zeichenabstände`,
  },
  figjamNext: {
    en: (v) =>
      `next: upload the pictures with upload_assets (multipart, so the file name names the layer), then run ${v.file} with use_figma`,
    de: (v) =>
      `weiter: die Bilder mit upload_assets hochladen (multipart, damit der Dateiname die Ebene benennt), dann ${v.file} mit use_figma ausführen`,
  },
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
