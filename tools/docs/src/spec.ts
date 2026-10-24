import { headerLine, signatureOf, summaryOf } from '@diagrist/cli/tables';
import type { Kind } from '@diagrist/core';
import { type GrammarField, type GrammarLine, grammarOf } from '@diagrist/lang';
import { ruleCodes } from './codes.js';
import { code, generatedFrom, table } from './markdown.js';
import { type PlacedStatement, placedStatements, whereOf } from './statements.js';

/** Where the language spec of a kind is checked in, relative to the repository root. */
export const specPath = (kind: string): string => `docs/language/${kind}.md`;

/**
 * The language spec of one kind in Markdown, derived from its tables through `grammarOf` and from its rules
 * (ADR 0004): every statement with arguments, clauses, attributes, flags, doc and examples, the meaning of each
 * arrow, where it may stand, and the diagnostic codes of the kind.
 */
export function languageSpec(kind: Kind, plugin: string): string {
  const grammar = grammarOf(kind.spec);
  const placed = placedStatements(grammar);
  const anchors = anchorsOf(placed);
  return [
    generatedFrom(`the statement tables of the kind \`${grammar.kind}\` (plugin \`${plugin}\`) and its rules`),
    '',
    `# \`${grammar.kind}\``,
    '',
    grammar.doc,
    '',
    `This page lists everything a \`${grammar.kind}\` diagram may contain. The same grammar is available as data with \`dgr grammar ${grammar.kind} --json\`, and [the overview](README.md) explains how lines, texts and attributes are written and lists the codes every kind shares.`,
    '',
    '## The first line',
    '',
    ...lineSection(`diagram ${grammar.kind} "Title"`, headerLine(grammar)),
    '## Statements',
    '',
    'Each statement is one line that starts with its keyword. Statements inside blocks are indented below them.',
    '',
    ...table(
      ['Statement', 'Where', 'What it does'],
      placed.map((p) => [`[${code(p.statement.keyword)}](#${anchors.get(p)})`, whereOf(p), summaryOf(p.statement.doc)]),
    ),
    '',
    ...placed.flatMap(statementSection),
    '## Diagnostic codes',
    '',
    `Besides the codes of the language and the kernel, listed in [the overview](README.md#diagnostic-codes), the rules of \`${grammar.kind}\` report these. An error stops the build; a warning is printed and the picture is still drawn.`,
    '',
    ...table(['Code', 'Severity', 'What it checks'], ruleCodes(kind)),
    '',
  ].join('\n');
}

/** Where a statement may stand, as a sentence that names every block. */
function placement(placed: PlacedStatement): string {
  const blocks = placed.parents.map(code).join(', ');
  if (!placed.topLevel) return `Written only inside ${blocks}.`;
  return placed.parents.length > 0 ? `Written at the top level and inside ${blocks}.` : 'Written at the top level.';
}

function statementSection(placed: PlacedStatement): string[] {
  const { statement } = placed;
  const children = statement.children.map((child) => code(child.keyword));
  const notes = [placement(placed), ...(children.length > 0 ? [`Indented below it: ${children.join(', ')}.`] : [])];
  return [
    `### \`${statement.keyword}\``,
    '',
    ...lineSection(statement.keyword, statement, notes.join(' ')),
    ...(statement.lines
      ? [
          'Indented lines that start without one of these keywords have this form:',
          '',
          ...lineSection('', statement.lines),
        ]
      : []),
  ];
}

/** Signature, doc and `notes`, a table of its parts, arrow meanings and examples of one line. */
function lineSection(head: string, line: GrammarLine, notes = ''): string[] {
  const rows = [
    ...line.arguments.map((a) => [
      code(a.optional ? `[${a.name}]` : `<${a.name}>`),
      a.optional ? 'optional argument' : 'argument',
      a.expected,
      a.doc,
    ]),
    ...line.clauses.map((c) => [code(`${c.name} <${c.type}>`), 'clause', c.expected, c.doc]),
    ...line.attributes.map((a) => [code(`${a.name}=`), 'attribute', a.expected, a.doc]),
    ...line.flags.map((f) => [code(f.name), 'flag', '', f.doc]),
  ];
  const meanings = [...line.arguments, ...line.clauses, ...line.attributes].filter(
    (field): field is GrammarField & { meanings: Readonly<Record<string, string>> } => field.meanings !== undefined,
  );
  return [
    '```text',
    signatureOf(head, line),
    '```',
    '',
    line.doc,
    '',
    ...(notes === '' ? [] : [notes, '']),
    ...(rows.length > 0 ? [...table(['Part', 'Kind', 'Value', 'Meaning'], rows), ''] : []),
    ...meanings.flatMap((field) => [
      `The values of ${code(field.name)} and what they mean:`,
      '',
      ...table(
        ['Value', 'Meaning'],
        Object.entries(field.meanings).map(([value, meaning]) => [code(value), meaning]),
      ),
      '',
    ]),
    `${line.examples.length > 1 ? 'Examples' : 'Example'}:`,
    '',
    '```dgr',
    ...line.examples,
    '```',
    '',
  ];
}

/** GitHub's anchor of each statement heading; a keyword described twice gets `-1`, `-2` as GitHub numbers them. */
function anchorsOf(placed: readonly PlacedStatement[]): Map<PlacedStatement, string> {
  const seen = new Map<string, number>();
  return new Map(
    placed.map((p) => {
      const slug = p.statement.keyword
        .toLowerCase()
        .replace(/[^\p{L}\p{N}_ -]/gu, '')
        .replace(/ /g, '-');
      const count = seen.get(slug) ?? 0;
      seen.set(slug, count + 1);
      return [p, count === 0 ? slug : `${slug}-${count}`];
    }),
  );
}
