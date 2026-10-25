import type { Diagnostic, Grammar, Locale, Need } from '@diagrist/lang';

/** A diagnostic with its text in the requested locale. The engine phrases it, because it owns the catalogue. */
export interface Finding extends Diagnostic {
  readonly message: string;
}

/** How the engine is asked to compile one source. */
export interface CompileOptions {
  /** Language of the finding messages. Texts inside the picture follow the `locale` header (ADR 0008). */
  readonly locale: Locale;
  /** Path of the source as given on the command line; paths it names are resolved against it. */
  readonly path?: string;
  /** Texts of the files the source needs (`Compilation.needs`), by their path. */
  readonly files?: Readonly<Record<string, string>>;
}

/** One picture of a source: the base, or a variant (ADR 0021). */
export interface Picture {
  /** The id of the variant; absent for the base picture. */
  readonly variant?: string;
  /** Present exactly when no finding of the file or of this picture has severity `error`. */
  readonly svg?: string;
}

/** What the engine gives back for one source: its pictures, the findings, and the files it needs. */
export interface Compilation {
  /** The base picture first, then one per variant. */
  readonly pictures: readonly Picture[];
  readonly diagnostics: readonly Finding[];
  /** Every file the source reads, with the place that names it; read the missing ones and compile again. */
  readonly needs: readonly Need[];
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
