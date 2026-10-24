import type { Span } from './span.js';

export type Severity = 'error' | 'warning';

/**
 * A finding about the source. Diagnostics are data: they carry a stable code and the values needed to
 * phrase the message, so the text can be rendered in any locale (see `formatDiagnostic`).
 */
export interface Diagnostic {
  readonly code: string;
  readonly severity: Severity;
  readonly span: Span;
  readonly values: Readonly<Record<string, string>>;
}

export function diagnostic(
  code: string,
  severity: Severity,
  at: Span,
  values: Record<string, string> = {},
): Diagnostic {
  return { code, severity, span: at, values };
}
