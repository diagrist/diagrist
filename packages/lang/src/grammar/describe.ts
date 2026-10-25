import { read } from '../tree.js';
import { SHARED_KEYWORDS, sharedStatements } from '../variants/tables.js';
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

/** One value of a line as data: an argument, a clause, an attribute or a header field, with its doc. */
export interface GrammarField {
  readonly name: string;
  readonly doc: string;
  readonly type: string;
  readonly expected: string;
  readonly optional?: boolean;
  readonly choices?: readonly string[];
  /** What each choice stands for, by choice, when the table says it. */
  readonly meanings?: Readonly<Record<string, string>>;
  readonly refersTo?: readonly string[];
}

/** One line as data, the shape shared by statements, line forms and the header. */
export interface GrammarLine {
  readonly doc: string;
  readonly examples: readonly string[];
  readonly arguments: readonly GrammarField[];
  readonly clauses: readonly GrammarField[];
  readonly attributes: readonly GrammarField[];
  readonly flags: readonly { readonly name: string; readonly doc: string }[];
}

/** A statement as data, with the statements it allows indented below it and its line form. */
export interface GrammarStatement extends GrammarLine {
  readonly keyword: string;
  readonly children: readonly (GrammarStatement | GrammarReference)[];
  readonly lines?: GrammarLine;
}

/**
 * A statement that is described in full elsewhere in the same grammar, such as `msg` inside a fragment or a
 * fragment inside itself. `ref` is a JSON Pointer (RFC 6901) from the grammar's root to that description.
 */
export interface GrammarReference {
  readonly keyword: string;
  readonly ref: string;
}

/**
 * The grammar of a kind as data, with `use` and `variant` after the kind's own statements, since every kind has them
 * (ADR 0021). Every table is described in full exactly once, at the shallowest place it occurs (top-level statements
 * first); every other occurrence is a `GrammarReference`. Recursive tables such as nested fragments stay finite, and
 * the size grows with the number of tables, not with how often they are reused.
 */
export function grammarOf(kind: KindSpec): Grammar {
  const statements = [...kind.statements, ...sharedStatements(kind)];
  const home = homes(statements);
  return {
    kind: kind.name,
    doc: kind.doc,
    header: fields(kind.header),
    statements: statements.map((spec, i) => describeFully(spec, `/statements/${i}`, home)),
  };
}

/** Where each table is described in full: the first place a breadth-first walk from the top level reaches it. */
function homes(statements: readonly StatementSpec[]): Map<StatementSpec, string> {
  const home = new Map<StatementSpec, string>();
  let level = statements.map((spec, i) => ({ spec, at: `/statements/${i}` }));
  while (level.length > 0) {
    const fresh: { spec: StatementSpec; at: string }[] = [];
    for (const entry of level) {
      if (home.has(entry.spec)) continue;
      home.set(entry.spec, entry.at);
      fresh.push(entry);
    }
    level = fresh.flatMap(({ spec, at }) =>
      spec.children.map((child, j) => ({ spec: child, at: `${at}/children/${j}` })),
    );
  }
  return home;
}

function describeStatement(
  spec: StatementSpec,
  at: string,
  home: ReadonlyMap<StatementSpec, string>,
): GrammarStatement | GrammarReference {
  const full = home.get(spec);
  return full !== undefined && full !== at ? { keyword: spec.keyword, ref: full } : describeFully(spec, at, home);
}

function describeFully(spec: StatementSpec, at: string, home: ReadonlyMap<StatementSpec, string>): GrammarStatement {
  return {
    keyword: spec.keyword,
    ...describeLine(spec),
    children: spec.children.map((child, j) => describeStatement(child, `${at}/children/${j}`, home)),
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
    ...(value.meanings ? { meanings: value.meanings } : {}),
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

  for (const spec of kind.statements)
    if (SHARED_KEYWORDS.includes(spec.keyword))
      problems.push(`statement ${spec.keyword} takes a keyword every kind has`);
  const visit = (spec: LineSpec, where: string, keyword?: string): void => {
    need(where, spec.doc);
    for (const a of spec.arguments) need(`${where}, argument ${a.name}`, a.doc);
    for (const [name, c] of Object.entries(spec.clauses)) need(`${where}, clause ${name}`, c.doc);
    for (const [name, a] of Object.entries(spec.attributes)) need(`${where}, attribute ${name}=`, a.doc);
    for (const [name, doc] of Object.entries(spec.flags)) need(`${where}, flag ${name}`, doc);
    if (spec.examples.length === 0) problems.push(`${where} has no example`);
    for (const example of spec.examples) problems.push(...exampleProblems(spec, example, where, keyword));
  };
  const visited = new Set<StatementSpec>();
  const visitStatement = (spec: StatementSpec): void => {
    if (visited.has(spec)) return;
    visited.add(spec);
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
