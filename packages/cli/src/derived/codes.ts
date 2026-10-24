import { formatMessage, KERNEL_CODES, type Kind } from '@diagrist/core';
import { diagnostic, formatDiagnostic, LANG_CODES, span } from '@diagrist/lang';
import { code } from './markdown.js';

/**
 * Values that fill every slot of a message with its own name, `{found}`, so a catalogue entry reads as the pattern of
 * all its messages. The catalogue stays the only place a message is written (ADR 0011).
 */
const PLACEHOLDERS: Readonly<Record<string, string>> = new Proxy(
  {},
  { get: (_, key) => (typeof key === 'string' ? `{${key}}` : undefined) },
);

const at = span(1, 1, 1);

/** The language's codes with the pattern of their English message, in code order. */
export function languageCodes(): string[][] {
  return sorted(Object.values(LANG_CODES)).map((found) => [
    code(found),
    formatDiagnostic(diagnostic(found, 'error', at, PLACEHOLDERS), 'en'),
  ]);
}

/** The kernel's codes, such as the placement check, with the pattern of their English message. */
export function kernelCodes(): string[][] {
  return sorted(Object.values(KERNEL_CODES)).map((found) => [
    code(found),
    formatMessage(diagnostic(found, 'error', at, PLACEHOLDERS), [], 'en'),
  ]);
}

/** The codes a kind's rules report, with severity and what each checks. */
export function ruleCodes(kind: Kind): string[][] {
  return kind.rules.map((rule) => [code(rule.code), rule.severity, rule.doc]);
}

function sorted(codes: readonly string[]): string[] {
  return [...codes].sort();
}
