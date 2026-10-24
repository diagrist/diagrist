import type { Diagnostic, Grammar, Locale } from '@diagrist/lang';

/** A diagnostic with its text in the requested locale. The engine phrases it, because it owns the catalogue. */
export interface Finding extends Diagnostic {
  readonly message: string;
}

export interface CompileOptions {
  /** Language of the finding messages. Texts inside the picture follow the `locale` header (ADR 0008). */
  readonly locale: Locale;
}

export interface Compilation {
  /** The picture, present exactly when no finding has severity `error`. */
  readonly svg?: string;
  readonly diagnostics: readonly Finding[];
}

/**
 * The port through which the commands reach the diagram kernel. It is as narrow as the commands need, so the
 * kernel is wired in at one place (`main.ts`) and the commands are tested against a small fake.
 */
export interface Engine {
  compile(source: string, options: CompileOptions): Compilation;
  /** Names of the diagram kinds the engine knows, in a stable order. */
  kinds(): readonly string[];
  /** The grammar of one kind as data, derived from its tables, or `undefined` for an unknown kind. */
  grammar(kind: string): Grammar | undefined;
}
