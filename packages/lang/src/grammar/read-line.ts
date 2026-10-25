import { type Diagnostic, diagnostic } from '../diagnostic.js';
import { list } from '../list.js';
import { LANG_CODES } from '../messages.js';
import { type Span, span } from '../span.js';
import type { Argument, Attribute, Origin } from '../tree.js';
import type { FileSource } from './files.js';
import type { LineSpec } from './spec.js';
import { type Declaration, type Reference, track } from './track.js';

export interface LineContext {
  readonly diagnostics: Diagnostic[];
  readonly references: Reference[];
  readonly declarations: Declaration[];
  /** Where `file()` values are read from; without it, as for examples, they keep the path as written. */
  readonly files?: FileSource;
}

export interface LineInput {
  /** What diagnostics call this line: its keyword, or "line in `flow`" for a line form. */
  readonly label: string;
  readonly keyword: string;
  readonly start: Span;
  readonly tokens: readonly Argument[];
  readonly attributes: readonly Attribute[];
  readonly line: number;
  readonly origin?: Origin;
}

/** Reads one line against its spec. Returns the values, or nothing when the line has errors. */
export function readLine(spec: LineSpec, input: LineInput, context: LineContext): Record<string, unknown> | undefined {
  const found = context.diagnostics.length;
  const values: Record<string, unknown> = { line: input.line, span: input.start };
  if (input.origin !== undefined) values.origin = input.origin;
  const next = readArguments(spec, input, values, context);
  values.flags = Object.fromEntries(Object.keys(spec.flags).map((flag) => [flag, false]));
  values.clauses = readTail(spec, input, next, values.flags as Record<string, boolean>, context);
  values.attributes = readAttributes(spec, input, context);
  return context.diagnostics.length === found ? values : undefined;
}

function readArguments(
  spec: LineSpec,
  input: LineInput,
  values: Record<string, unknown>,
  context: LineContext,
): number {
  let index = 0;
  for (const argument of spec.arguments) {
    const token = input.tokens[index];
    const result =
      token !== undefined && argument.value.tokens.includes(token.kind)
        ? argument.value.read(token.value)
        : { ok: false as const };
    if (token !== undefined && result.ok) {
      values[argument.name] = track(argument.name, argument.value, result.value, token, input, context);
      index++;
    } else if (argument.optional) {
      values[argument.name] = undefined;
    } else if (token === undefined) {
      report(context, LANG_CODES.missingArgument, endOf(input), {
        statement: input.label,
        name: argument.name,
        expected: argument.value.expected,
        example: spec.examples[0] ?? input.keyword,
      });
    } else {
      report(context, LANG_CODES.invalidValue, token.span, {
        name: argument.name,
        found: token.value,
        expected: argument.value.expected,
      });
      index++;
    }
  }
  return index;
}

/**
 * How many of `tokens` the arguments of `spec` take, read the way `readLine` reads them: a token that fits is taken,
 * an optional argument that does not fit is skipped, a required one takes the token anyway and is reported there.
 */
export function argumentEnd(spec: LineSpec, tokens: readonly Argument[]): number {
  let index = 0;
  for (const argument of spec.arguments) {
    const token = tokens[index];
    if (token === undefined) break;
    const fits = argument.value.tokens.includes(token.kind) && argument.value.read(token.value).ok;
    if (fits || !argument.optional) index++;
  }
  return index;
}

function readTail(
  spec: LineSpec,
  input: LineInput,
  start: number,
  flags: Record<string, boolean>,
  context: LineContext,
): Record<string, unknown> {
  const clauses: Record<string, unknown> = {};
  for (let index = start; index < input.tokens.length; index++) {
    const token = input.tokens[index];
    if (token === undefined) break;
    if (token.kind === 'word' && token.value in spec.flags) {
      flags[token.value] = true;
      continue;
    }
    const clause = token.kind === 'word' ? spec.clauses[token.value] : undefined;
    const value = input.tokens[index + 1];
    if (clause !== undefined && value !== undefined) {
      const result = clause.value.tokens.includes(value.kind) ? clause.value.read(value.value) : { ok: false as const };
      if (result.ok) {
        clauses[token.value] = track(token.value, clause.value, result.value, value, input, context);
      } else {
        report(context, LANG_CODES.invalidValue, value.span, {
          name: token.value,
          found: value.value,
          expected: clause.value.expected,
        });
      }
      index++;
      continue;
    }
    report(context, LANG_CODES.unexpectedToken, token.span, {
      found: token.value,
      statement: input.label,
      allowed: list([...Object.keys(spec.flags), ...Object.keys(spec.clauses).map((c) => `${c} <value>`)]),
      example: spec.examples[0] ?? input.keyword,
    });
  }
  return clauses;
}

function readAttributes(spec: LineSpec, input: LineInput, context: LineContext): Record<string, unknown> {
  const attributes: Record<string, unknown> = {};
  for (const attribute of input.attributes) {
    const definition = spec.attributes[attribute.key];
    if (definition === undefined) {
      report(context, LANG_CODES.unknownAttribute, attribute.span, {
        statement: input.label,
        key: attribute.key,
        allowed: list(Object.keys(spec.attributes).map((key) => `${key}=`)),
      });
      continue;
    }
    const result = definition.value.read(attribute.value);
    if (result.ok) {
      attributes[attribute.key] = track(`${attribute.key}=`, definition.value, result.value, attribute, input, context);
    } else {
      report(context, LANG_CODES.invalidValue, attribute.span, {
        name: `${attribute.key}=`,
        found: attribute.value,
        expected: definition.value.expected,
      });
    }
  }
  return attributes;
}

function endOf(input: LineInput): Span {
  const last = [input.start, ...input.tokens.map((t) => t.span), ...input.attributes.map((a) => a.span)].reduce(
    (a, b) => (b.column > a.column ? b : a),
  );
  return span(input.line, last.column + last.length, 1);
}

export function report(context: LineContext, code: string, at: Span, values: Record<string, string>): void {
  context.diagnostics.push(diagnostic(code, 'error', at, values));
}
