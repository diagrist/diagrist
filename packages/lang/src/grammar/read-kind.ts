import type { Diagnostic } from '../diagnostic.js';
import { list } from '../list.js';
import { LANG_CODES } from '../messages.js';
import type { Document, Entry, Statement } from '../tree.js';
import { checkIds } from './ids.js';
import { type LineContext, readLine, report } from './read-line.js';
import type { Infer, KindSpec, StatementSpec } from './spec.js';
import { nearest } from './suggest.js';

/** The first line of a diagram, `diagram <kind> "Title"`, read against the header table of its kind. */
export interface Header {
  readonly title: string;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly line: number;
}

/** A diagram read against the tables of its kind: the header, the statements typed from them, and what was wrong. */
export interface KindReading<S> {
  readonly header?: Header;
  readonly statements: readonly S[];
  readonly diagnostics: readonly Diagnostic[];
}

/** What `unfold` tells `readKind` about a variant's picture. */
export interface ReadOptions {
  /** Ids a variant dropped, with the variant: a reference to one of them is L114 instead of L107. */
  readonly dropped?: ReadonlyMap<string, string>;
}

/** Keywords every kind allows at the top level besides its own, resolved by `unfold` before a picture is read. */
export const FILE_KEYWORDS: readonly string[] = ['use', 'variant'];

/**
 * Reads a statement tree as a diagram of one kind. Every statement is checked against the kind's tables;
 * ids must be unique and references must point to declared ids. Statements with errors are left out, their
 * diagnostics explain why. A file with `use` or `variant` is read through `unfold`, which calls this per picture.
 */
export function readKind<S extends readonly StatementSpec[]>(
  kind: KindSpec<S>,
  document: Document,
  options: ReadOptions = {},
): KindReading<Infer<S[number]>> {
  const context: LineContext = { diagnostics: [], references: [], declarations: [] };
  const [first, ...rest] = document.statements;
  const header = first !== undefined ? readHeader(kind, first, context) : undefined;
  if (header === undefined) {
    report(context, LANG_CODES.missingHeader, first?.keywordSpan ?? { line: 1, column: 1, length: 1 }, {
      kind: kind.name,
    });
  }
  const body = header === undefined ? document.statements : rest;
  const statements = readStatements(kind.statements, body, context, undefined, FILE_KEYWORDS);
  checkIds(context, options.dropped ?? new Map());
  const diagnostics = [...context.diagnostics].sort(
    (a, b) => a.span.line - b.span.line || a.span.column - b.span.column,
  );
  return { ...(header ? { header } : {}), statements: statements as Infer<S[number]>[], diagnostics };
}

function readHeader(kind: KindSpec, statement: Statement, context: LineContext): Header | undefined {
  const [name, title] = statement.arguments;
  if (statement.keyword !== 'diagram' || name?.kind !== 'word' || name.value !== kind.name || title?.kind !== 'text') {
    return undefined;
  }
  const values = readLine(
    {
      doc: kind.doc,
      examples: [`diagram ${kind.name} "Title"`],
      arguments: [],
      clauses: {},
      attributes: kind.header,
      flags: {},
    },
    {
      label: 'diagram',
      keyword: 'diagram',
      start: statement.keywordSpan,
      tokens: [],
      attributes: statement.attributes,
      line: statement.line,
    },
    context,
  );
  return {
    title: title.value,
    attributes: (values?.attributes as Record<string, unknown>) ?? {},
    line: statement.line,
  };
}

function readStatements(
  specs: readonly StatementSpec[],
  statements: readonly Statement[],
  context: LineContext,
  parent?: StatementSpec,
  alsoAllowed: readonly string[] = [],
): Record<string, unknown>[] {
  const values: Record<string, unknown>[] = [];
  for (const statement of statements) {
    const spec = specs.find((s) => s.keyword === statement.keyword);
    if (spec !== undefined) {
      const value = readStatement(spec, statement, context);
      if (value !== undefined) values.push(value);
    } else if (parent?.lines === undefined) {
      report(context, LANG_CODES.unknownKeyword, statement.keywordSpan, {
        found: statement.keyword,
        allowed: list([...specs.map((s) => s.keyword), ...alsoAllowed]),
        suggestion:
          nearest(
            statement.keyword,
            specs.map((s) => s.keyword),
          ) ?? '',
      });
    }
  }
  return values;
}

function readStatement(
  spec: StatementSpec,
  statement: Statement,
  context: LineContext,
): Record<string, unknown> | undefined {
  const values = readLine(
    spec,
    {
      label: spec.keyword,
      keyword: spec.keyword,
      start: statement.keywordSpan,
      tokens: statement.arguments,
      attributes: statement.attributes,
      line: statement.line,
      ...originOf(statement),
    },
    context,
  );
  const children = readStatements(spec.children, statement.children, context, spec);
  const lineValues = readLineForms(spec, statement, context);
  return values === undefined ? undefined : { ...values, keyword: spec.keyword, children, lines: lineValues };
}

/** Indented lines that are not child statements: entries, and child lines whose first word is no child keyword. */
function readLineForms(spec: StatementSpec, statement: Statement, context: LineContext): Record<string, unknown>[] {
  const form = spec.lines;
  const keywordLines = statement.children.filter((child) => !spec.children.some((c) => c.keyword === child.keyword));
  if (form === undefined) {
    for (const entry of statement.entries) {
      report(context, LANG_CODES.noLinesHere, entry.textSpan, {
        statement: spec.keyword,
        allowed: list(spec.children.map((c) => c.keyword)),
      });
    }
    return [];
  }
  const label = `line in \`${spec.keyword}\``;
  const fromStatements = keywordLines.map((line) =>
    readLine(
      form,
      {
        label,
        keyword: spec.keyword,
        start: line.keywordSpan,
        tokens: [{ kind: 'word', value: line.keyword, span: line.keywordSpan }, ...line.arguments],
        attributes: line.attributes,
        line: line.line,
        ...originOf(line),
      },
      context,
    ),
  );
  const fromEntries = statement.entries.map((entry: Entry) =>
    readLine(
      form,
      {
        label,
        keyword: spec.keyword,
        start: entry.textSpan,
        tokens: [{ kind: 'text', value: entry.text, span: entry.textSpan }, ...entry.arguments],
        attributes: entry.attributes,
        line: entry.line,
        ...originOf(entry),
      },
      context,
    ),
  );
  return [...fromStatements, ...fromEntries]
    .filter((value): value is Record<string, unknown> => value !== undefined)
    .sort((a, b) => (a.line as number) - (b.line as number));
}

const originOf = (part: Statement | Entry) => (part.origin === undefined ? {} : { origin: part.origin });
