import type { Kind, Plugin } from '@diagrist/core';
import { type GrammarField, grammarOf } from '@diagrist/lang';
import { type Command, commandLine, headerLine, signatureOf, summaryOf } from 'diagrist/tables';
import { LANGUAGE_BASICS } from './basics.js';
import { kernelCodes, languageCodes, ruleCodes } from './codes.js';
import type { DerivedFile } from './files.js';
import { code, generatedFrom, table } from './markdown.js';
import { ownStatements, SHARED_BASICS, sharedStatements } from './shared.js';
import { type PlacedStatement, placedStatements, whereOf } from './statements.js';

/** Where the agent skill is checked in, relative to the repository root. */
export const SKILL_DIR = 'skills/diagrist';

/**
 * Where the generated part of the skill lies, relative to the skill: the language, one file per kind and the codes.
 * Everything else in the skill folder is written by hand, starting with `SKILL.md` (ADR 0036).
 */
export const SKILL_REFERENCE = 'reference';

/** The path of a kind's reference inside the skill folder, such as `reference/sequence.md`. */
export const kindReferencePath = (kind: string): string => `${SKILL_REFERENCE}/${kind}.md`;

/**
 * The generated part of the agent skill, which `SKILL.md` and the handwritten guides link to: the basics of the
 * language with the commands, a reference per kind and the codes. An agent opens a file only when it needs it, so a
 * diagram of one kind reads one kind (ADR 0036). All of it is derived from the command tables, the statement tables
 * and the catalogues (ADR 0004).
 */
export function skillReference(plugins: readonly Plugin[], commands: readonly Command[]): DerivedFile[] {
  const kinds = plugins.flatMap((plugin) => plugin.kinds);
  const at = (path: string) => `${SKILL_DIR}/${path}`;
  return [
    { path: at(`${SKILL_REFERENCE}/language.md`), content: languageFile(plugins, commands) },
    ...kinds.map((kind) => ({ path: at(kindReferencePath(kind.spec.name)), content: kindFile(kind) })),
    { path: at(`${SKILL_REFERENCE}/codes.md`), content: codesFile() },
  ];
}

/** How every file is written, the commands, and the statements every kind has. */
function languageFile(plugins: readonly Plugin[], commands: readonly Command[]): string {
  return lines([
    generatedFrom('the command tables and the statement tables'),
    '',
    '# The language and the commands',
    '',
    ...paragraphs(LANGUAGE_BASICS),
    '## Commands',
    '',
    'Every command takes `--json` for one JSON document on stdout.',
    '',
    ...table(
      ['Command', 'What it does'],
      commands.map((command) => [code(commandLine(command)), summaryOf(command.doc)]),
    ),
    '',
    '## Statements of every kind',
    '',
    ...paragraphs(SHARED_BASICS),
    ...statementTable(sharedStatements(plugins)),
  ]);
}

/** One kind in short: its first line, every statement with signature, purpose and example, its arrows and codes. */
function kindFile(kind: Kind): string {
  const grammar = ownStatements(grammarOf(kind.spec));
  const placed = placedStatements(grammar);
  const withMeanings = placed.flatMap(({ statement }) =>
    statement.arguments
      .filter((field): field is GrammarField & { meanings: Readonly<Record<string, string>> } => !!field.meanings)
      .map((field) => ({ keyword: statement.keyword, meanings: field.meanings })),
  );
  return lines([
    generatedFrom(`the statement tables and the rules of \`${grammar.kind}\``),
    '',
    `# Kind \`${grammar.kind}\``,
    '',
    `${grammar.doc} Full reference with every argument: \`dgr grammar ${grammar.kind} --json\`.`,
    '',
    '```text',
    signatureOf(`diagram ${grammar.kind} "Title"`, headerLine(grammar)),
    '```',
    '',
    ...statementTable(placed),
    '',
    ...withMeanings.flatMap(({ keyword, meanings }) => [
      `The arrows of ${code(keyword)}: ${Object.entries(meanings)
        .map(([arrow, meaning]) => `${code(arrow)} ${meaning}`)
        .join(', ')}.`,
      '',
    ]),
    'Every kind also has `use`, `variant`, `set` and `drop`; see [the language](language.md).',
    '',
    `The rules of \`${grammar.kind}\` report these codes:`,
    '',
    ...table(['Code', 'Severity', 'What it checks'], ruleCodes(kind)),
  ]);
}

/** The codes of the language and the kernel; each kind's own codes stand in its reference. */
function codesFile(): string {
  return lines([
    generatedFrom('the diagnostic catalogues'),
    '',
    '# Diagnostic codes',
    '',
    'The letter of a code names who reports it. Messages show values as `{name}`; in `--json` they are the `values` of the diagnostic. The codes of a kind stand at the end of its reference. These come from the language:',
    '',
    ...table(['Code', 'Message'], languageCodes()),
    '',
    'These come from the kernel:',
    '',
    ...table(['Code', 'Message'], kernelCodes()),
  ]);
}

/** Statements as one table row each: signature, where they stand, what they do, an example. */
function statementTable(placed: readonly PlacedStatement[]): string[] {
  return table(
    ['Line', 'Where', 'What it does', 'Example'],
    placed.map(({ statement, ...where }) => [
      code(signatureOf(statement.keyword, statement)),
      whereOf({ statement, ...where }),
      summaryOf(statement.doc),
      code(statement.examples[0] ?? statement.keyword),
    ]),
  );
}

const paragraphs = (texts: readonly string[]): string[] => texts.flatMap((text) => [text, '']);

const lines = (all: readonly string[]): string => `${all.join('\n')}\n`;
