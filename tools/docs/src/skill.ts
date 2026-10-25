import type { Kind, Plugin } from '@diagrist/core';
import { either, type GrammarField, grammarOf } from '@diagrist/lang';
import { type Command, commandLine, headerLine, signatureOf, summaryOf } from 'diagrist/tables';
import { LANGUAGE_BASICS } from './basics.js';
import { kernelCodes, languageCodes, ruleCodes } from './codes.js';
import { code, generatedFrom, table } from './markdown.js';
import { ownStatements, SHARED_BASICS, sharedStatements } from './shared.js';
import { SKILL_INTRO } from './skill-intro.js';
import { type PlacedStatement, placedStatements, whereOf } from './statements.js';

/** Where the agent skill is checked in, relative to the repository root. */
export const SKILL_PATH = 'skills/diagrist/SKILL.md';

/**
 * The agent skill in the format of Claude Code skills: frontmatter with `name` and `description`, then how to work,
 * the commands, a short reference of every kind and the diagnostic codes. All but the intro is derived from the
 * command tables, the statement tables and the catalogues (ADR 0004).
 */
export function agentSkill(plugins: readonly Plugin[], commands: readonly Command[]): string {
  const kinds = plugins.flatMap((plugin) => plugin.kinds);
  const names = either(kinds.map((kind) => kind.spec.name));
  return [
    '---',
    'name: diagrist',
    `description: ${SKILL_INTRO.description.replace('{kinds}', names)}`,
    '---',
    '',
    generatedFrom('the command tables, the statement tables of every kind and the diagnostic catalogues'),
    '',
    '# Diagrist',
    '',
    ...[...SKILL_INTRO.lead, ...LANGUAGE_BASICS].flatMap((paragraph) => [paragraph, '']),
    '## How to work',
    '',
    ...SKILL_INTRO.workflow.flatMap((paragraph) => [paragraph, '']),
    'Every command takes `--json` for one JSON document on stdout. The commands:',
    '',
    ...table(
      ['Command', 'What it does'],
      commands.map((command) => [code(commandLine(command)), summaryOf(command.doc)]),
    ),
    '',
    ...kinds.flatMap(kindReference),
    '## Statements of every kind',
    '',
    ...SHARED_BASICS.flatMap((paragraph) => [paragraph, '']),
    ...statementTable(sharedStatements(plugins)),
    '',
    '## Diagnostic codes',
    '',
    'The letter of a code names who reports it. Messages show values as `{name}`; in `--json` they are the `values` of the diagnostic. These come from the language:',
    '',
    ...table(['Code', 'Message'], languageCodes()),
    '',
    'These come from the kernel:',
    '',
    ...table(['Code', 'Message'], kernelCodes()),
    '',
  ].join('\n');
}

/** One kind in short: its first line, every statement with signature, purpose and example, its arrows and codes. */
function kindReference(kind: Kind): string[] {
  const grammar = ownStatements(grammarOf(kind.spec));
  const placed = placedStatements(grammar);
  const withMeanings = placed.flatMap(({ statement }) =>
    statement.arguments
      .filter((field): field is GrammarField & { meanings: Readonly<Record<string, string>> } => !!field.meanings)
      .map((field) => ({ keyword: statement.keyword, meanings: field.meanings })),
  );
  return [
    `## Kind \`${grammar.kind}\``,
    '',
    `${grammar.doc} Full reference: \`dgr grammar ${grammar.kind}\`.`,
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
    `The rules of \`${grammar.kind}\` report these codes:`,
    '',
    ...table(['Code', 'Severity', 'What it checks'], ruleCodes(kind)),
    '',
  ];
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
