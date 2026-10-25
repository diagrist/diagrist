import { type Diagnostic, diagnostic } from '../diagnostic.js';
import { LANG_CODES } from '../messages.js';
import type { Span } from '../span.js';
import { resolvePath } from '../variants/path.js';
import type { FileText } from './value.js';

/** A file a diagram needs to be read, by its path relative to the host's folder, and the place that asks for it. */
export interface Need {
  readonly path: string;
  readonly span: Span;
}

/** What a reading knows about files: where the file being read lies, what the host handed over, what was needed. */
export interface FileSource {
  /** Path of the compiled file relative to the host's folder; a line of a used file resolves against its `Span.file`. */
  readonly from: string;
  readonly texts: Readonly<Record<string, string>>;
  readonly needs: Need[];
}

/**
 * The file a `file()` value names, the one way `use` reads too (ADR 0021): the path written at `at` is resolved by
 * `resolvePath` (L119 when it is not allowed), listed in `needs`, and its text taken from what the host handed over
 * (L118 while it has not). Returns `undefined` when it reported.
 */
export function fileText(
  written: string,
  at: Span,
  source: FileSource,
  diagnostics: Diagnostic[],
): FileText | undefined {
  const resolved = resolvePath(at.file ?? source.from, written);
  if ('problem' in resolved) {
    diagnostics.push(diagnostic(LANG_CODES.forbiddenPath, 'error', at, { found: written, case: resolved.problem }));
    return undefined;
  }
  const { path } = resolved;
  source.needs.push({ path, span: at });
  const text = source.texts[path];
  if (text === undefined) {
    diagnostics.push(diagnostic(LANG_CODES.missingFile, 'error', at, { file: path }));
    return undefined;
  }
  return { path, text };
}
