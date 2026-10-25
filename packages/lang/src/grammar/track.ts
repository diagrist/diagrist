import type { Span } from '../span.js';
import { fileText } from './files.js';
import type { LineContext, LineInput } from './read-line.js';
import type { Value } from './value.js';

/** A value that refers to an id, checked once the whole diagram is read. */
export interface Reference {
  readonly name: string;
  readonly found: string;
  readonly value: Value<unknown>;
  readonly span: Span;
}

/** An id a line declares, with the line, so a second declaration can name the first (L108). */
export interface Declaration {
  readonly id: string;
  readonly keyword: string;
  readonly line: number;
  readonly span: Span;
}

/**
 * Records what a value of an argument, clause or attribute declares and refers to, so all are checked after reading,
 * and returns what the line keeps of it: the value as read, or for a `file()` value the file it names, read from
 * `context.files`. `written` is the token as written, with its span.
 */
export function track(
  name: string,
  value: Value<unknown>,
  read: unknown,
  written: { readonly value: string; readonly span: Span },
  input: LineInput,
  context: LineContext,
): unknown {
  const { value: raw, span: at } = written;
  if (value.declaresId === true) {
    context.declarations.push({ id: raw, keyword: input.keyword, line: input.line, span: at });
  }
  if (value.refersTo !== undefined) context.references.push({ name, found: raw, value, span: at });
  if (value.readsFile !== true || context.files === undefined) return read;
  return fileText(raw, at, context.files, context.diagnostics);
}
