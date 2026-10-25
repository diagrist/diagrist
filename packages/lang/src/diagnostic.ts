import type { Span } from './span.js';

/** An `error` stops the build and fails `dgr check`; a `warning` is reported and the picture is still drawn. */
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
  /**
   * The variant whose picture the finding is about, when a file draws several pictures and the finding holds in
   * some of them only. Absent for findings about the file itself and for the base picture.
   */
  readonly picture?: string;
}

/** Builds a diagnostic; `values` fill the slots of its message and default to none. */
export function diagnostic(
  code: string,
  severity: Severity,
  at: Span,
  values: Record<string, string> = {},
): Diagnostic {
  return { code, severity, span: at, values };
}
