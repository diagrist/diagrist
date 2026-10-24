import { type Diagnostic, formatDiagnostic, type Locale } from '@diagrist/lang';
import type { Finding } from '../engine.js';
import { say } from '../messages.js';

/** Meaning of each field of a diagnostic in `--json`, for the reference. */
export const DIAGNOSTIC_FIELDS: Readonly<Record<string, string>> = {
  file: 'Path of the source as given on the command line.',
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
  const { code, severity, span, values, message } = finding;
  return { file, code, severity, span, values, message };
}

/** Control characters but tab, and lone surrogates: a terminal would act on them, such as an escape sequence. */
const UNPRINTABLE = /(?!\t)[\p{Cc}\p{Cs}]/gu;

/**
 * A diagnostic for people: `file:line:column  code  severity: message`, then the source line with `^` under
 * the span. Tabs before the span are kept in the marker line, so the marker stays aligned. What a terminal would
 * act on is shown as U+FFFD, one for one, so a source cannot steer the terminal and the marker stays in place.
 */
export function diagnosticText(file: string, source: string, finding: Finding, locale: Locale): string {
  const { line, column, length } = finding.span;
  const message = finding.message.replace(UNPRINTABLE, '\uFFFD');
  const head = `${file}:${line}:${column}  ${finding.code}  ${say(finding.severity, locale)}: ${message}`;
  const text = source.split(/\r\n?|\n/)[line - 1]?.replace(UNPRINTABLE, '\uFFFD');
  if (text === undefined) return head;
  const before = text.slice(0, column - 1).replace(/[^\t]/g, ' ');
  const width = Math.max(1, Math.min(length, text.length - column + 1));
  return `${head}\n  ${text}\n  ${before}${'^'.repeat(width)}`;
}
