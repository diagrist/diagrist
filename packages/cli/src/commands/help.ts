import { unknownCommand } from '../parse.js';
import { type Command, command, EXIT_CODES, GLOBAL_OPTIONS, type Options, ROOT_OPTIONS } from './command.js';
import { commandText, overviewText } from './help-text.js';
import { commandLine } from './usage.js';

export const help: Command = command({
  name: 'help',
  doc: 'Explains the commands. Without a command it lists them all, with the options every command takes and the exit codes.',
  arguments: [{ name: 'command', count: 'optional', doc: 'The command to explain, such as `fmt`.' }],
  options: {},
  examples: [
    { command: 'dgr help', doc: 'List the commands.' },
    { command: 'dgr help fmt', doc: 'Arguments, options and examples of `fmt`; the same as `dgr fmt --help`.' },
    { command: 'dgr help --json', doc: 'All command tables as data, for agents.' },
  ],
  json: {
    commands:
      'The tables of the explained commands: `{ name, doc, usage, arguments, options, examples, json }`, all of them without a command.',
    options: 'Options every command takes, in the same form as the options of a command.',
    rootOptions: 'Options of `dgr` without a command.',
    exitCodes: '`[{ code, doc }]`.',
  },
  async run({ arguments: { command: name }, commands }) {
    const chosen = name === undefined ? commands : commands.filter((c) => c.name === name);
    if (name !== undefined && chosen.length === 0) return unknownCommand(name, commands);
    const [single] = chosen;
    return {
      exitCode: 0,
      json: {
        commands: chosen.map(tableJson),
        options: optionsJson(GLOBAL_OPTIONS),
        rootOptions: optionsJson(ROOT_OPTIONS),
        exitCodes: EXIT_CODES,
      },
      text: name !== undefined && single ? commandText(single) : overviewText(commands),
    };
  },
});

function tableJson(table: Command): Readonly<Record<string, unknown>> {
  const { name, doc, arguments: args, options, examples, json } = table;
  return { name, doc, usage: commandLine(table), arguments: args, options: optionsJson(options), examples, json };
}

function optionsJson(options: Options): readonly Readonly<Record<string, unknown>>[] {
  return Object.entries(options).map(([name, spec]) => ({ name, ...spec }));
}
