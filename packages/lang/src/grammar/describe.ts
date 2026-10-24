import { read } from '../tree.js';
import { type LineContext, readLine } from './read-line.js';
import type { Attr, KindSpec, LineSpec, StatementSpec } from './spec.js';
import type { Value } from './value.js';

/** The grammar of a kind as plain data, for agents, tools, the spec and the JSON schema (ADR 0004, ADR 0005). */
export interface Grammar {
  readonly kind: string;
  readonly doc: string;
  readonly header: readonly GrammarField[];
  readonly statements: readonly GrammarStatement[];
}

export interface GrammarField {
  readonly name: string;
  readonly doc: string;
  readonly type: string;
  readonly expected: string;
  readonly optional?: boolean;
  readonly choices?: readonly string[];
  readonly refersTo?: readonly string[];
}

export interface GrammarLine {
  readonly doc: string;
  readonly examples: readonly string[];
  readonly arguments: readonly GrammarField[];
  readonly clauses: readonly GrammarField[];
  readonly attributes: readonly GrammarField[];
  readonly flags: readonly { readonly name: string; readonly doc: string }[];
}

export interface GrammarStatement extends GrammarLine {
  readonly keyword: string;
  readonly children: readonly GrammarStatement[];
  readonly lines?: GrammarLine;
}

export function grammarOf(kind: KindSpec): Grammar {
  return {
    kind: kind.name,
    doc: kind.doc,
    header: fields(kind.header),
    statements: kind.statements.map(describeStatement),
  };
}

function describeStatement(spec: StatementSpec): GrammarStatement {
  return {
    keyword: spec.keyword,
    ...describeLine(spec),
    children: spec.children.map(describeStatement),
    ...(spec.lines ? { lines: describeLine(spec.lines) } : {}),
  };
}

function describeLine(spec: LineSpec): GrammarLine {
  return {
    doc: spec.doc,
    examples: spec.examples,
    arguments: spec.arguments.map((a) => ({ ...field(a.name, a.doc, a.value), optional: a.optional })),
    clauses: fields(spec.clauses),
    attributes: fields(spec.attributes),
    flags: Object.entries(spec.flags).map(([name, doc]) => ({ name, doc })),
  };
}

function fields(record: Readonly<Record<string, Attr>>): GrammarField[] {
  return Object.entries(record).map(([name, attribute]) => field(name, attribute.doc, attribute.value));
}

function field(name: string, doc: string, value: Value<unknown>): GrammarField {
  return {
    name,
    doc,
    type: value.type,
    expected: value.expected,
    ...(value.choices ? { choices: value.choices } : {}),
    ...(value.refersTo ? { refersTo: value.refersTo } : {}),
  };
}

/**
 * Checks a kind's tables against ADR 0005: everything is documented, every statement and line form has an
 * example, and every example reads without diagnostics. Returns one message per problem.
 */
export function checkKind(kind: KindSpec): string[] {
  const problems: string[] = [];
  const need = (where: string, doc: string): void => {
    if (doc.trim() === '') problems.push(`${where} has no doc`);
  };
  need(`kind ${kind.name}`, kind.doc);
  for (const [name, attribute] of Object.entries(kind.header)) need(`header attribute ${name}=`, attribute.doc);

  const visit = (spec: LineSpec, where: string, keyword?: string): void => {
    need(where, spec.doc);
    for (const a of spec.arguments) need(`${where}, argument ${a.name}`, a.doc);
    for (const [name, c] of Object.entries(spec.clauses)) need(`${where}, clause ${name}`, c.doc);
    for (const [name, a] of Object.entries(spec.attributes)) need(`${where}, attribute ${name}=`, a.doc);
    for (const [name, doc] of Object.entries(spec.flags)) need(`${where}, flag ${name}`, doc);
    if (spec.examples.length === 0) problems.push(`${where} has no example`);
    for (const example of spec.examples) problems.push(...exampleProblems(spec, example, where, keyword));
  };
  const visitStatement = (spec: StatementSpec): void => {
    visit(spec, `statement ${spec.keyword}`, spec.keyword);
    if (spec.lines) visit(spec.lines, `line form of ${spec.keyword}`);
    spec.children.forEach(visitStatement);
  };
  kind.statements.forEach(visitStatement);
  return problems;
}

function exampleProblems(spec: LineSpec, example: string, where: string, keyword?: string): string[] {
  const [first] = read(example).document.statements;
  const entry = read(`x\n  ${example}`).document.statements[0]?.entries[0];
  const head = keyword !== undefined ? first : undefined;
  if (keyword !== undefined && head?.keyword !== keyword)
    return [`${where}: example \`${example}\` does not start with ${keyword}`];
  const context: LineContext = { diagnostics: [], references: [], declarations: [] };
  const tokens = head
    ? head.arguments
    : entry
      ? [{ kind: 'text' as const, value: entry.text, span: entry.textSpan }, ...entry.arguments]
      : first
        ? [{ kind: 'word' as const, value: first.keyword, span: first.keywordSpan }, ...first.arguments]
        : [];
  const attributes = head?.attributes ?? entry?.attributes ?? first?.attributes ?? [];
  readLine(
    spec,
    { label: where, keyword: keyword ?? '', start: { line: 1, column: 1, length: 0 }, tokens, attributes, line: 1 },
    context,
  );
  return context.diagnostics.map((d) => `${where}: example \`${example}\` has ${d.code}`);
}
