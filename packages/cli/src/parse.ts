import { parseArgs } from 'node:util';
import { LOCALES, type Locale, list, nearest } from '@diagrist/lang';
import { type Command, GLOBAL_OPTIONS, type Options, ROOT_OPTIONS } from './commands/command.js';
import { usageOf } from './commands/usage.js';
import { type Problem, problem } from './messages.js';

type Arguments = Readonly<Record<string, string | readonly string[] | undefined>>;
type Token = NonNullable<ReturnType<typeof parseArgs>['tokens']>[number];

/** A call read from the command line and checked against the command's table. */
export interface Parsed {
  /** `undefined` for `dgr` without a command. */
  readonly command: Command | undefined;
  readonly arguments: Arguments;
  readonly options: Readonly<Record<string, string | boolean>>;
  readonly json: boolean;
  readonly locale: Locale;
  readonly help: boolean;
  readonly problem?: Problem;
}

/**
 * Reads `argv` (without node and script) as `<command> [arguments] [options]`. It never throws: a wrong call
 * comes back as a problem, together with `--json` and `--locale`, so it is reported the way the caller asked.
 * Options are tokenized leniently and checked here against the table, which allows teaching messages.
 */
export function parse(argv: readonly string[], commands: readonly Command[]): Parsed {
  const [first, ...rest] = argv;
  const named = first !== undefined && !first.startsWith('-');
  const command = named ? commands.find((c) => c.name === first) : undefined;
  const spec: Options = { ...(command ? command.options : ROOT_OPTIONS), ...GLOBAL_OPTIONS };
  const { values, positionals, tokens } = parseArgs({
    args: named ? rest : [...argv],
    options: Object.fromEntries(
      Object.entries(spec).map(([name, o]) => [name, o.short ? { type: o.type, short: o.short } : { type: o.type }]),
    ),
    strict: false,
    allowPositionals: true,
    tokens: true,
  });
  const options = Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string | boolean] => entry[1] !== undefined),
  );
  const parsed: Parsed = {
    command,
    arguments: {},
    options,
    json: options.json === true,
    locale: LOCALES.find((locale) => locale === options.locale) ?? 'en',
    help: options.help === true,
  };
  const found = named && command === undefined ? unknownCommand(first, commands) : checkOptions(tokens, spec, command);
  if (found) return { ...parsed, problem: found };
  if (parsed.help) return parsed;
  if (command === undefined) {
    const [stray] = positionals;
    return stray === undefined ? parsed : { ...parsed, problem: problem('commandFirst', { found: stray }) };
  }
  const bound = bind(command, positionals);
  return 'problem' in bound ? { ...parsed, problem: bound.problem } : { ...parsed, arguments: bound.arguments };
}

/** Suggests the nearest command and shows it in use, or `dgr help` when nothing is near. */
export function unknownCommand(found: string, commands: readonly Command[]): Problem {
  const names = commands.map((c) => c.name);
  const suggestion = nearest(found, names) ?? '';
  const example = commands.find((c) => c.name === suggestion)?.examples[0].command ?? 'dgr help';
  return problem('unknownCommand', { found, allowed: list(names), suggestion, example });
}

/** The first option that is unknown, lacks its value, has one it must not have, or is not one of its choices. */
function checkOptions(tokens: readonly Token[], spec: Options, command: Command | undefined): Problem | undefined {
  const where = command ? `dgr ${command.name}` : 'dgr';
  for (const token of tokens) {
    if (token.kind !== 'option') continue;
    const option = spec[token.name];
    const shown = token.rawName;
    if (option === undefined) {
      const allowed = Object.keys(spec).map((name) => `--${name}`);
      const suggestion = nearest(shown, allowed) ?? '';
      const example = exampleWith(command, suggestion);
      return problem('unknownOption', { command: where, found: shown, allowed: list(allowed), suggestion, example });
    }
    const example = exampleWith(command, shown);
    const { value } = token;
    if (option.type === 'boolean') {
      if (value !== undefined) return problem('unexpectedValue', { option: shown, example });
      continue;
    }
    if (value === undefined || (!token.inlineValue && value.startsWith('-'))) {
      const placeholder = option.choices ? list(option.choices) : `<${option.value ?? 'value'}>`;
      return problem('missingValue', { option: shown, value: placeholder, example });
    }
    if (option.choices && !option.choices.includes(value)) {
      const values = { option: shown, found: value, allowed: list(option.choices), example };
      return problem('invalidChoice', values);
    }
  }
  return undefined;
}

/** The first example of the command that uses the option, so the message shows it in use. */
function exampleWith(command: Command | undefined, option: string): string {
  const examples = command?.examples ?? [];
  return (examples.find((e) => option !== '' && e.command.includes(option)) ?? examples[0])?.command ?? 'dgr help';
}

/** Assigns positionals to the command's arguments in order; `many` takes the rest. */
function bind(command: Command, positionals: readonly string[]): { arguments: Arguments } | { problem: Problem } {
  const where = `dgr ${command.name}`;
  const example = command.examples[0].command;
  const bound: Record<string, string | readonly string[] | undefined> = {};
  let next = 0;
  for (const spec of command.arguments) {
    const taken = spec.count === 'many' ? positionals.slice(next) : positionals.slice(next, next + 1);
    next += taken.length;
    if (taken.length === 0 && spec.count !== 'optional') {
      const values = { command: where, name: `<${spec.name}>`, doc: spec.doc, example };
      return { problem: problem('missingArgument', values) };
    }
    bound[spec.name] = spec.count === 'many' ? taken : taken[0];
  }
  const extra = positionals[next];
  if (extra === undefined) return { arguments: bound };
  const values = { command: where, found: extra, usage: usageOf(command.arguments), example };
  return { problem: problem('extraArgument', values) };
}
