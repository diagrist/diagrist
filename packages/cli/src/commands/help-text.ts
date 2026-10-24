import { DESCRIPTION, PROGRAM_NAMES } from '../manifest.js';
import { type Command, EXIT_CODES, GLOBAL_OPTIONS, type Options, ROOT_OPTIONS } from './command.js';
import { argumentLabel, commandLine, optionLabel, summaryOf } from './usage.js';

/** The overview behind `dgr help` and `dgr` without arguments, derived from the command tables. */
export function overviewText(commands: readonly Command[]): string {
  return [
    DESCRIPTION,
    '',
    'Usage: dgr <command> [arguments] [options]',
    `Installed as: ${PROGRAM_NAMES.join(', ')}`,
    '',
    'Commands:',
    ...rows(commands.map((c) => [c.name, summaryOf(c.doc)])),
    '',
    'Options for every command:',
    ...optionRows(GLOBAL_OPTIONS),
    '',
    'Without a command:',
    ...optionRows(ROOT_OPTIONS),
    '',
    ...exitCodeLines(),
    '',
    'Run `dgr help <command>` or `dgr <command> --help` for its arguments, options and examples.',
  ].join('\n');
}

/** The help behind `dgr help <command>` and `dgr <command> --help`. */
export function commandText(command: Command): string {
  return [
    commandLine(command),
    '',
    command.doc,
    '',
    'Arguments:',
    ...rows(command.arguments.map((a) => [argumentLabel(a), a.doc])),
    '',
    'Options:',
    ...optionRows({ ...command.options, ...GLOBAL_OPTIONS }),
    '',
    'Examples:',
    ...rows(command.examples.map((e) => [e.command, e.doc])),
    '',
    ...exitCodeLines(),
  ].join('\n');
}

function exitCodeLines(): string[] {
  return ['Exit codes:', ...rows(EXIT_CODES.map((e) => [String(e.code), e.doc]))];
}

function optionRows(options: Options): string[] {
  return rows(Object.entries(options).map(([name, spec]) => [optionLabel(name, spec), spec.doc]));
}

/** Two aligned columns, indented by two spaces. */
function rows(pairs: readonly (readonly [string, string])[]): string[] {
  const width = Math.max(0, ...pairs.map(([left]) => left.length));
  return pairs.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`);
}
