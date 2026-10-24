import {
  argumentLabel,
  type Command,
  commandLine,
  DESCRIPTION,
  DIAGNOSTIC_FIELDS,
  EXIT_CODES,
  GLOBAL_OPTIONS,
  JSON_ENVELOPE,
  type Options,
  optionLabel,
  PROGRAM_NAMES,
  ROOT_OPTIONS,
  summaryOf,
} from 'diagrist/tables';
import { code, generatedFrom, table } from './markdown.js';

/** Where the reference is checked in, relative to the repository root. */
export const REFERENCE_PATH = 'docs/cli.md';

/** The command reference in Markdown, derived from the same tables as `dgr help` (ADR 0004). */
export function reference(commands: readonly Command[]): string {
  return [
    generatedFrom('the command tables in packages/cli/src/commands'),
    '',
    '# Command line',
    '',
    DESCRIPTION,
    '',
    `Installed as ${PROGRAM_NAMES.map(code).join(' and ')}. Usage: \`dgr <command> [arguments] [options]\`; the command comes first.`,
    '',
    ...table(
      ['Command', 'What it does'],
      commands.map((c) => [`[${code(c.name)}](#dgr-${c.name})`, summaryOf(c.doc)]),
    ),
    '',
    '## Options for every command',
    '',
    ...optionTable(GLOBAL_OPTIONS),
    '',
    'Without a command:',
    '',
    ...optionTable(ROOT_OPTIONS),
    '',
    '## Exit codes',
    '',
    ...table(
      ['Code', 'Meaning'],
      EXIT_CODES.map((e) => [String(e.code), e.doc]),
    ),
    ...commands.flatMap(commandSection),
    '',
    '## JSON output',
    '',
    'With `--json` every call prints exactly one JSON document on stdout, also when it is refused. Fields in every document:',
    '',
    ...fieldTable(JSON_ENVELOPE),
    '',
    'The fields of each command are listed in its section.',
    '',
    '### Diagnostics',
    '',
    ...fieldTable(DIAGNOSTIC_FIELDS),
    '',
  ].join('\n');
}

function commandSection(command: Command): string[] {
  return [
    '',
    `## dgr ${command.name}`,
    '',
    '```sh',
    commandLine(command),
    '```',
    '',
    command.doc,
    '',
    ...table(
      ['Argument', 'Meaning'],
      command.arguments.map((a) => [code(argumentLabel(a)), a.doc]),
    ),
    '',
    ...(Object.keys(command.options).length > 0 ? [...optionTable(command.options), ''] : []),
    'Examples:',
    '',
    '```sh',
    ...command.examples.flatMap((e) => [`# ${e.doc}`, e.command]),
    '```',
    '',
    'With `--json`, besides the fields of every document:',
    '',
    ...fieldTable(command.json),
  ];
}

function optionTable(options: Options): string[] {
  return table(
    ['Option', 'Meaning'],
    Object.entries(options).map(([name, spec]) => [code(optionLabel(name, spec)), spec.doc]),
  );
}

function fieldTable(fields: Readonly<Record<string, string>>): string[] {
  return table(
    ['Field', 'Meaning'],
    Object.entries(fields).map(([name, doc]) => [code(name), doc]),
  );
}
