import { article, either } from '../list.js';
import type { Argument } from '../tree.js';

export type TokenKind = Argument['kind'];

/** A token read as a value, or `ok: false` when it does not fit; the caller reports what was expected. */
export type ValueResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

/**
 * How one value in a line is read and described. The description (`type`, `expected`, `choices`) is what
 * diagnostics, completion, the JSON grammar and the spec show (ADR 0004, ADR 0005).
 */
export interface Value<T> {
  readonly type: string;
  /** What a correct value looks like, phrased for an agent: "an identifier like `api`". */
  readonly expected: string;
  readonly tokens: readonly TokenKind[];
  /** The complete list of allowed values, when there is one. */
  readonly choices?: readonly string[];
  /** What each choice stands for, when the table says it, such as `->` for a synchronous call. */
  readonly meanings?: Readonly<Record<string, string>>;
  /** The kind of id this value refers to, when it is a reference (see `ref`). */
  readonly refersTo?: readonly string[];
  /** Whether the value declares an id that references can point to. */
  readonly declaresId?: boolean;
  read(raw: string): ValueResult<T>;
}

const IDENTIFIER = /^[\p{L}_][\p{L}\p{N}_-]*$/u;

const ok = <T>(value: T): ValueResult<T> => ({ ok: true, value });
const fail: ValueResult<never> = { ok: false };

/** An identifier declared by this statement, which references elsewhere can point to. */
export function id(): Value<string> {
  return {
    type: 'id',
    expected: 'an identifier like `api` (letters, digits, `_` and `-`, starting with a letter)',
    tokens: ['word'],
    declaresId: true,
    read: (raw) => (IDENTIFIER.test(raw) ? ok(raw) : fail),
  };
}

/** An identifier declared elsewhere in the diagram, by one of the given statement keywords. */
export function ref(...targets: string[]): Value<string> {
  return {
    type: 'ref',
    expected: `the id of ${article(targets[0] ?? '')} ${either(targets.map((t) => `\`${t}\``))} declared in this diagram`,
    tokens: ['word'],
    refersTo: targets,
    read: (raw) => (IDENTIFIER.test(raw) ? ok(raw) : fail),
  };
}

/** Free text in double quotes. */
export function text(): Value<string> {
  return { type: 'text', expected: 'a text in double quotes like `"Order service"`', tokens: ['text'], read: ok };
}

/** A single word without quotes, such as a path or a version. */
export function word(): Value<string> {
  return { type: 'word', expected: 'a single word without quotes', tokens: ['word'], read: ok };
}

/** One word out of a fixed list. */
export function oneOf<const C extends string>(choices: readonly C[]): Value<C> {
  const allowed = new Set<string>(choices);
  return {
    type: 'oneOf',
    expected: `one of ${choices.map((c) => `\`${c}\``).join(', ')}`,
    tokens: ['word'],
    choices,
    read: (raw) => (allowed.has(raw) ? ok(raw as C) : fail),
  };
}

/**
 * One operator out of a fixed list, such as the arrow of a message. Given as a table from operator to meaning, the
 * meanings reach the grammar, completion and every diagnostic that lists the arrows, from this one place.
 */
export function arrow<const C extends string>(operators: readonly C[] | Readonly<Record<C, string>>): Value<C> {
  const meanings: Readonly<Record<string, string>> | undefined = isList(operators) ? undefined : operators;
  const choices: readonly C[] = isList(operators) ? operators : keysOf(operators);
  const allowed = new Set<string>(choices);
  const shown = (o: string): string => (meanings?.[o] ? `\`${o}\` ${meanings[o]}` : `\`${o}\``);
  return {
    type: 'arrow',
    expected: `one of the arrows ${choices.map(shown).join(', ')}`,
    tokens: ['operator'],
    choices,
    ...(meanings ? { meanings } : {}),
    read: (raw) => (allowed.has(raw) ? ok(raw as C) : fail),
  };
}

function isList<C extends string>(operators: readonly C[] | Readonly<Record<C, string>>): operators is readonly C[] {
  return Array.isArray(operators);
}

function keysOf<C extends string>(table: Readonly<Record<C, string>>): readonly C[] {
  return Object.keys(table) as C[];
}

/** A decimal number, optionally within bounds. */
export function number(bounds: { min?: number; max?: number } = {}): Value<number> {
  const range = [
    bounds.min !== undefined ? `at least ${bounds.min}` : '',
    bounds.max !== undefined ? `at most ${bounds.max}` : '',
  ]
    .filter(Boolean)
    .join(' and ');
  return {
    type: 'number',
    expected: `a number like \`12\` or \`2.5\`${range ? `, ${range}` : ''}`,
    tokens: ['word'],
    read: (raw) => {
      const value = Number(raw);
      const inRange =
        (bounds.min === undefined || value >= bounds.min) && (bounds.max === undefined || value <= bounds.max);
      return /^-?\d+(\.\d+)?$/.test(raw) && inRange ? ok(value) : fail;
    },
  };
}
