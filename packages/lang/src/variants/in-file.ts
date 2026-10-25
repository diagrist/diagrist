import type { Diagnostic } from '../diagnostic.js';
import type { Comment } from '../scanner.js';
import type { Span } from '../span.js';
import type { Document, Entry, Statement } from '../tree.js';

/**
 * A document read from a used file with `file` on every span, so a diagnostic about one of its lines names the file
 * it is in, not the file being compiled.
 */
export function inFile(document: Document, file: string): Document {
  const at = (s: Span): Span => ({ ...s, file });
  const comment = (c: Comment): Comment => ({ ...c, span: at(c.span) });
  const part = <T extends Statement | Entry>(p: T): T => ({
    ...p,
    arguments: p.arguments.map((a) => ({ ...a, span: at(a.span) })),
    attributes: p.attributes.map((a) => ({ ...a, span: at(a.span) })),
    comments: {
      above: p.comments.above.map(comment),
      ...(p.comments.inline ? { inline: comment(p.comments.inline) } : {}),
    },
  });
  const statement = (s: Statement): Statement => ({
    ...part(s),
    keywordSpan: at(s.keywordSpan),
    children: s.children.map(statement),
    entries: s.entries.map((e) => ({ ...part(e), textSpan: at(e.textSpan) })),
  });
  return { statements: document.statements.map(statement), trailingComments: document.trailingComments.map(comment) };
}

/** Diagnostics of a used file with `file` on their spans. */
export function diagnosticsIn(diagnostics: readonly Diagnostic[], file: string): Diagnostic[] {
  return diagnostics.map((d) => ({ ...d, span: { ...d.span, file } }));
}
