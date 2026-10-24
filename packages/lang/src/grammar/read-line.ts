import { type Diagnostic, diagnostic } from '../diagnostic.js';
import { LANG_CODES } from '../messages.js';
import { type Span, span } from '../span.js';
import type { Argument, Attribute } from '../tree.js';
import type { LineSpec } from './spec.js';
import type { Value } from './value.js';

/** A value that refers to an id, checked once the whole diagram is read. */
export interface Reference {
  readonly name: string;
  readonly found: string;
  readonly value: Value<unknown>;
  readonly span: Span;
}

export interface Declaration {
  readonly id: string;
  readonly keyword: string;
  readonly line: number;
  readonly span: Span;
}

export interface LineContext {
  readonly diagnostics: Diagnostic[];
  readonly references: Reference[];
  readonly declarations: Declaration[];
}

export interface LineInput {
  /** What diagnostics call this line: its keyword, or "line in `flow`" for a line form. */
  readonly label: string;
  readonly keyword: string;
  readonly start: Span;
  readonly tokens: readonly Argument[];
  readonly attributes: readonly Attribute[];
  readonly line: number;
}

/** Reads one line against its spec. Returns the values, or nothing when the line has errors. */
export function readLine(spec: LineSpec, input: LineInput, context: LineContext): Record<string, unknown> | undefined {
  const found = context.diagnostics.length;
  const values: Record<string, unknown> = { line: input.line, span: input.start };
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
      values[argument.name] = result.value;
      track(argument.name, argument.value, token, input, context);
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
        clauses[token.value] = result.value;
        track(token.value, clause.value, value, input, context);
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
    if (result.ok) attributes[attribute.key] = result.value;
    else {
      report(context, LANG_CODES.invalidValue, attribute.span, {
        name: `${attribute.key}=`,
        found: attribute.value,
        expected: definition.value.expected,
      });
    }
  }
  return attributes;
}

function track(name: string, value: Value<unknown>, token: Argument, input: LineInput, context: LineContext): void {
  if (value.declaresId === true) {
    context.declarations.push({ id: token.value, keyword: input.keyword, line: input.line, span: token.span });
  }
  if (value.refersTo !== undefined) context.references.push({ name, found: token.value, value, span: token.span });
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

export function list(items: readonly string[]): string {
  return items.length > 0 ? items.map((item) => (item.startsWith('`') ? item : `\`${item}\``)).join(', ') : 'nothing';
}
