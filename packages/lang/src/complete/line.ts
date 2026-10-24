import type { Arg, LineSpec } from '../grammar/spec.js';
import type { Value } from '../grammar/value.js';
import type { Argument, Attribute } from '../tree.js';

/** What can be inserted: a keyword, a clause keyword, `key=`, a flag, an allowed value or a declared id. */
export type CompletionKind = 'keyword' | 'clause' | 'attribute' | 'flag' | 'value' | 'id';

export interface CompletionItem {
  /** The text that replaces the word typed so far. */
  readonly label: string;
  readonly kind: CompletionKind;
  /** What the item means, from the table it comes from. */
  readonly doc: string;
}

/** Proposes the declared ids of the statements with these keywords, for a value that refers to them. */
export type IdsOf = (keywords: readonly string[]) => CompletionItem[];

/** Where the arguments of a line stand: which token fills which argument, and the first argument left open. */
export interface Matched {
  readonly filled: ReadonlyMap<Arg, Argument>;
  /** Index of the first argument without a token; the number of arguments when all are given. */
  readonly next: number;
  /** Tokens after the arguments: flags and clauses. */
  readonly tail: readonly Argument[];
}

/** Pairs tokens with arguments the way `readKind` does: an optional argument is skipped when the token does not fit. */
export function matchArguments(spec: LineSpec, tokens: readonly Argument[]): Matched {
  const filled = new Map<Arg, Argument>();
  let index = 0;
  for (const [position, argument] of spec.arguments.entries()) {
    const token = tokens[index];
    if (token === undefined) return { filled, next: position, tail: [] };
    if (fits(argument.value, token)) filled.set(argument, token);
    if (fits(argument.value, token) || !argument.optional) index++;
  }
  return { filled, next: spec.arguments.length, tail: tokens.slice(index) };
}

function fits(value: Value<unknown>, token: Argument): boolean {
  return value.tokens.includes(token.kind) && value.read(token.value).ok;
}

/**
 * Everything that may follow the tokens of a line, from its table: the next arguments' values, and once only
 * optional arguments are left, the flags, clauses and attributes not used yet. After a clause keyword only its
 * values; after `key=` only the attribute's values.
 */
export function lineItems(
  spec: LineSpec,
  tokens: readonly (Argument | Attribute)[],
  typed: string,
  idsOf: IdsOf,
): CompletionItem[] {
  const equals = typed.indexOf('=');
  if (equals !== -1) {
    const attribute = spec.attributes[typed.slice(0, equals)];
    return attribute ? valueItems(attribute.value, attribute.doc, idsOf) : [];
  }
  const args = tokens.filter((token): token is Argument => token.kind !== 'attribute');
  const present = new Set(tokens.flatMap((token) => (token.kind === 'attribute' ? [token.key] : [])));
  const { next, tail } = matchArguments(spec, args);
  const items: CompletionItem[] = [];
  for (const argument of spec.arguments.slice(next)) {
    items.push(...valueItems(argument.value, argument.doc, idsOf));
    if (!argument.optional) return items;
  }
  const used = new Set<string>();
  for (let index = 0; index < tail.length; index++) {
    const word = tail[index]?.value ?? '';
    const clause = spec.clauses[word];
    used.add(word);
    if (clause === undefined) continue;
    if (index === tail.length - 1) return valueItems(clause.value, clause.doc, idsOf);
    index++;
  }
  return [
    ...items,
    ...Object.entries(spec.flags)
      .filter(([name]) => !used.has(name))
      .map(([name, doc]): CompletionItem => ({ label: name, kind: 'flag', doc })),
    ...Object.entries(spec.clauses)
      .filter(([name]) => !used.has(name))
      .map(([name, clause]): CompletionItem => ({ label: name, kind: 'clause', doc: clause.doc })),
    ...Object.entries(spec.attributes)
      .filter(([key]) => !present.has(key))
      .map(([key, attribute]): CompletionItem => ({ label: `${key}=`, kind: 'attribute', doc: attribute.doc })),
  ];
}

/** The values a field allows: its choices with their meaning, or the declared ids it may refer to. */
export function valueItems(value: Value<unknown>, doc: string, idsOf: IdsOf): CompletionItem[] {
  if (value.refersTo !== undefined) return idsOf(value.refersTo);
  return (value.choices ?? []).map((choice) => ({
    label: choice,
    kind: 'value',
    doc: value.meanings?.[choice] ?? doc,
  }));
}
