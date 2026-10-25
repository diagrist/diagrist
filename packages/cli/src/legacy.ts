import type { Locale } from '@diagrist/lang';
import type { Finding } from './engine.js';

type Texts = Readonly<Record<Locale, (values: Readonly<Record<string, string>>) => string>>;

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
