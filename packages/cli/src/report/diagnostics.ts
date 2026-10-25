import { type Diagnostic, formatDiagnostic, type Locale } from '@diagrist/lang';
import type { Finding } from '../engine.js';
import { say } from '../say.js';

/** Meaning of each field of a diagnostic in `--json`, for the reference. */
export const DIAGNOSTIC_FIELDS: Readonly<Record<string, string>> = {
  file: 'Path of the file the finding is in: the source as given on the command line, or a file it uses.',
  picture: 'Only for a finding about one picture of a file with variants: the id of the variant.',
  code: 'Stable code such as `L001`; the prefix names the package or plugin that reports it.',
  severity: '`error` (exit code 1) or `warning`.',
  span: '`{ line, column, length }`: 1-based line and column, length in characters.',
  values: 'The values the message is built from, by name. Use these instead of parsing the message.',
  message: 'The text in the requested locale.',
};

/** Phrases the diagnostics of the language itself, for commands that need no engine. */
export function languageFindings(diagnostics: readonly Diagnostic[], locale: Locale): Finding[] {
  return diagnostics.map((found) => ({ ...found, message: formatDiagnostic(found, locale) }));
}

export function hasError(findings: readonly Finding[]): boolean {
  return findings.some((finding) => finding.severity === 'error');
}

export function diagnosticJson(file: string, finding: Finding): Readonly<Record<string, unknown>> {
  const { code, severity, span, values, message, picture } = finding;
  const { file: other, ...place } = span;
  return {
    file: other ?? file,
    ...(picture === undefined ? {} : { picture }),
    code,
    severity,
    span: place,
    values,
    message,
  };
}

/** Every finding as `diagnosticText` writes it, each with the line of the file it is in: the source or a used one. */
export function diagnosticLines(
  file: string,
  source: string,
  files: Readonly<Record<string, string>>,
  findings: readonly Finding[],
  locale: Locale,
): string[] {
  return findings.map((d) => diagnosticText(file, (d.span.file ? files[d.span.file] : source) ?? '', d, locale));
}

/** Control characters but tab, and lone surrogates: a terminal would act on them, such as an escape sequence. */
const UNPRINTABLE = /(?!\t)[\p{Cc}\p{Cs}]/gu;

/**
 * A diagnostic for people: `file:line:column  [variant]  code  severity: message`, then the source line with `^`
 * under the span. The file is the one the span is in, the variant is there for a finding about one picture only.
 * Tabs before the span are kept in the marker line, so the marker stays aligned. What a terminal would act on is
 * shown as U+FFFD, one for one, so a source cannot steer the terminal and the marker stays in place.
 */
export function diagnosticText(file: string, source: string, finding: Finding, locale: Locale): string {
  const { line, column, length } = finding.span;
  const message = finding.message.replace(UNPRINTABLE, '\uFFFD');
  const where = `${finding.span.file ?? file}:${line}:${column}  ${finding.picture ? `[${finding.picture}]  ` : ''}`;
  const head = `${where}${finding.code}  ${say(finding.severity, locale)}: ${message}`;
  const text = source.split(/\r\n?|\n/)[line - 1]?.replace(UNPRINTABLE, '\uFFFD');
  if (text === undefined) return head;
  const before = text.slice(0, column - 1).replace(/[^\t]/g, ' ');
  const width = Math.max(1, Math.min(length, text.length - column + 1));
  return `${head}\n  ${text}\n  ${before}${'^'.repeat(width)}`;
}
