import type { Span } from '../span.js';
import type { Value } from './value.js';

/** One positional value of a line, in order. */
export interface Arg<N extends string = string, T = unknown, O extends boolean = boolean> {
  readonly name: N;
  readonly value: Value<T>;
  readonly optional: O;
  readonly doc: string;
}

/** A named value of a line: an attribute written `key=value`, a clause, or a field of the header. */
export interface Attr<T = unknown> {
  readonly value: Value<T>;
  readonly doc: string;
}

/** `required` arguments come first; `optional` ones are skipped when the next token does not fit. */
export function arg<const N extends string, T>(name: N, value: Value<T>, doc: string): Arg<N, T, false> {
  return { name, value, optional: false, doc };
}

/** An argument that may be left out; it is skipped when the next token does not fit its value. */
export function optionalArg<const N extends string, T>(name: N, value: Value<T>, doc: string): Arg<N, T, true> {
  return { name, value, optional: true, doc };
}

/** An attribute, clause or header field with its value type and what it means. */
export function attr<T>(value: Value<T>, doc: string): Attr<T> {
  return { value, doc };
}

/** The shape of one line, shared by statements and line forms. */
export interface LineSpec {
  readonly doc: string;
  /** Complete lines as an agent would write them. Each one must read without diagnostics. */
  readonly examples: readonly string[];
  readonly arguments: readonly Arg[];
  /** Keyword-value pairs anywhere after the arguments, such as `in backend`. */
  readonly clauses: Readonly<Record<string, Attr>>;
  readonly attributes: Readonly<Record<string, Attr>>;
  /** Single words anywhere after the arguments, with what they do. */
  readonly flags: Readonly<Record<string, string>>;
}

/** The table of one statement: its keyword, its line, and the statements allowed indented below it. */
export interface StatementSpec<K extends string = string> extends LineSpec {
  readonly keyword: K;
  readonly children: readonly StatementSpec[];
  /** The form of indented lines that do not start with a child keyword (ADR 0006), e.g. UML members. */
  readonly lines?: LineSpec;
}

/** The tables of a diagram kind: its name as written after `diagram`, its header fields, its top-level statements. */
export interface KindSpec<S extends readonly StatementSpec[] = readonly StatementSpec[]> {
  readonly name: string;
  readonly doc: string;
  readonly header: Readonly<Record<string, Attr>>;
  readonly statements: S;
}

type Definition<S> = {
  readonly doc: string;
  readonly examples: readonly string[];
  readonly arguments?: readonly Arg[];
  readonly clauses?: Readonly<Record<string, Attr>>;
  readonly attributes?: Readonly<Record<string, Attr>>;
  readonly flags?: Readonly<Record<string, string>>;
} & S;

/**
 * Declares a statement table. Left-out parts default to none; the result keeps the literal types of the definition,
 * so `Infer` can type what `readKind` reads.
 */
export function statement<
  const K extends string,
  const D extends Definition<{ readonly children?: readonly StatementSpec[]; readonly lines?: LineSpec }>,
>(keyword: K, definition: D): StatementSpec<K> & Complete<D> {
  return { keyword, children: [], ...complete(definition) } as StatementSpec<K> & Complete<D>;
}

/** Declares a line form (ADR 0006): the shape of indented lines that start without a keyword. */
export function lines<const D extends Definition<object>>(definition: D): LineSpec & Complete<D> {
  return complete(definition) as LineSpec & Complete<D>;
}

/** Declares the tables of a diagram kind; a kind without header fields gets an empty header. */
export function kind<const S extends readonly StatementSpec[]>(
  name: string,
  definition: { doc: string; header?: Readonly<Record<string, Attr>>; statements: S },
): KindSpec<S> {
  return { name, doc: definition.doc, header: definition.header ?? {}, statements: definition.statements };
}

type Complete<D> = Omit<D, 'arguments' | 'clauses' | 'attributes' | 'flags'> & {
  readonly arguments: D extends { arguments: infer A } ? A : readonly [];
  readonly clauses: D extends { clauses: infer C } ? C : Record<never, never>;
  readonly attributes: D extends { attributes: infer A } ? A : Record<never, never>;
  readonly flags: D extends { flags: infer F } ? F : Record<never, never>;
};

function complete<D extends Definition<object>>(definition: D): Complete<D> {
  return { arguments: [], clauses: {}, attributes: {}, flags: {}, ...definition } as unknown as Complete<D>;
}

type ValueOf<V> = V extends Value<infer T> ? T : never;

type ArgValues<A> = A extends readonly Arg[]
  ? {
      readonly [X in A[number] as X['name']]: X['optional'] extends true
        ? ValueOf<X['value']> | undefined
        : ValueOf<X['value']>;
    }
  : Record<never, never>;

type OptionalValues<R> = { readonly [K in keyof R]?: R[K] extends Attr<infer T> ? T : never };

type LineValues<S> = (S extends { arguments: infer A } ? ArgValues<A> : Record<never, never>) & {
  readonly clauses: S extends { clauses: infer C } ? OptionalValues<C> : Record<never, never>;
  readonly attributes: S extends { attributes: infer A } ? OptionalValues<A> : Record<never, never>;
  readonly flags: S extends { flags: infer F } ? { readonly [K in keyof F]: boolean } : Record<never, never>;
  readonly line: number;
  readonly span: Span;
};

/** The typed value of a statement, derived from its spec (ADR 0004): no hand-written types or builders. */
export type Infer<S> = S extends unknown ? InferOne<S> : never;

type InferOne<S> = LineValues<S> & {
  readonly keyword: S extends { keyword: infer K } ? K : never;
  readonly children: S extends { children: readonly (infer C)[] } ? readonly Infer<C>[] : readonly [];
  readonly lines: S extends { lines: infer L } ? readonly LineValues<L>[] : readonly [];
};
