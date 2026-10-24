import { LOCALES, type Locale } from '@diagrist/lang';
import type { Engine } from '../engine.js';
import type { Io } from '../io.js';
import type { Problem } from '../messages.js';
import type { Raster } from '../raster.js';

/** A positional argument. `one` is exactly one value, `optional` zero or one, `many` one or more. */
export interface ArgumentSpec {
  readonly name: string;
  readonly doc: string;
  readonly count: 'one' | 'optional' | 'many';
}

export interface OptionSpec {
  readonly type: 'boolean' | 'string';
  readonly doc: string;
  readonly short?: string;
  /** Placeholder for the value in usage lines, e.g. `file`. String options only. */
  readonly value?: string;
  /** The complete list of allowed values, when the option is a choice. */
  readonly choices?: readonly string[];
}

/** The options of a command by their long name, without the leading `--`. */
export type Options = Readonly<Record<string, OptionSpec>>;

export interface Example {
  readonly command: string;
  readonly doc: string;
}

type OptionValues<O extends Options> = {
  readonly [K in keyof O]?: O[K]['type'] extends 'boolean' ? boolean : string;
};

type ArgumentValues<A extends readonly ArgumentSpec[]> = {
  readonly [X in A[number] as X['name']]: X['count'] extends 'many'
    ? readonly string[]
    : X['count'] extends 'one'
      ? string
      : string | undefined;
};

/** What a command produced, in both forms; `run` prints the one the caller asked for. */
export interface Outcome {
  readonly exitCode: 0 | 1;
  /** The command's fields of the `--json` document; `run` adds the envelope. */
  readonly json: Readonly<Record<string, unknown>>;
  /** The output for people, printed on stdout. */
  readonly text: string;
}

/** What every command gets from `run` besides its arguments and options. */
interface Context {
  readonly locale: Locale;
  readonly io: Io;
  /** The diagram kernel behind the port (ADR 0009); `main.ts` wires in the real one. */
  readonly engine: Engine;
  /** Turns SVGs into PNGs behind its port; `main.ts` loads the real renderer when the first PNG is asked for. */
  readonly raster: Raster;
  /** All command tables, for `help`. */
  readonly commands: readonly Command[];
}

/** A command at work: its arguments and options, already checked against its table, typed from it. */
export interface Call<O extends Options, A extends readonly ArgumentSpec[]> extends Context {
  readonly arguments: ArgumentValues<A>;
  readonly options: OptionValues<O>;
}

/** A call as `run` builds it, before the command's table gives it types. */
export interface AnyCall extends Context {
  readonly arguments: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly options: Readonly<Record<string, string | boolean>>;
}

/** The parts of a command that `help`, the reference and the argument checks are derived from. */
interface Table<O extends Options, A extends readonly ArgumentSpec[]> {
  readonly name: string;
  /** The first sentence is the summary in the list of commands. */
  readonly doc: string;
  readonly arguments: A;
  readonly options: O;
  /** At least one. The first is the example shown in messages about a wrong call. */
  readonly examples: readonly [Example, ...Example[]];
  /** Fields of the `--json` document besides the envelope, with what they mean. */
  readonly json: Readonly<Record<string, string>>;
}

/**
 * One command as a table (ADR 0004): `dgr help`, `dgr <command> --help`, the reference in docs/cli.md and
 * the checks of arguments and options are all derived from it.
 */
export interface Command extends Table<Options, readonly ArgumentSpec[]> {
  run(call: AnyCall): Promise<Outcome | Problem>;
}

/**
 * Declares a command. Its `run` sees arguments and options typed from its own table; `parse` has checked
 * them against the same table, which is what makes widening to `Command` safe.
 */
export function command<const O extends Options, const A extends readonly ArgumentSpec[]>(
  spec: Table<O, A> & { run(call: Call<O, A>): Promise<Outcome | Problem> },
): Command {
  return spec as unknown as Command;
}

/** Options every command takes. `run` handles them, so commands never see them. */
export const GLOBAL_OPTIONS: Options = {
  json: {
    type: 'boolean',
    doc: 'Print one JSON document on stdout instead of text, for agents and tools. Its form is stable, see "JSON output".',
  },
  locale: {
    type: 'string',
    value: 'locale',
    choices: LOCALES,
    doc: 'Language of messages and diagnostics. Default: `en`.',
  },
  help: { type: 'boolean', short: 'h', doc: 'Show the help of the command instead of running it.' },
};

/** Options of `dgr` without a command. */
export const ROOT_OPTIONS: Options = {
  version: { type: 'boolean', doc: 'Print the version of the CLI.' },
};

/** Every exit code `dgr` can end with, and when; `dgr help` and the reference list them. */
export const EXIT_CODES: readonly { readonly code: number; readonly doc: string }[] = [
  { code: 0, doc: 'Done: no finding with severity error. Warnings alone do not fail.' },
  { code: 1, doc: 'A finding with severity error, or `fmt --check` found a file that is not formatted.' },
  {
    code: 2,
    doc: 'The call cannot be carried out: unknown command or option, missing or extra argument, a value out of range, unreadable or unwritable file, a PNG that cannot be rendered. Also an unexpected error inside dgr, which is a bug and printed in one line on stderr.',
  },
];

/** Version of the `--json` form, the `diagrist-cli` field of every document. */
export const JSON_FORM = 1;

/** Fields every `--json` document has, or has in the case named. */
export const JSON_ENVELOPE: Readonly<Record<string, string>> = {
  'diagrist-cli': `Version of this JSON form, currently \`${JSON_FORM}\`. It is raised only when a field changes meaning or goes away.`,
  command: 'The command that ran, `null` for `dgr --version` and when no command was recognized.',
  ok: '`true` exactly when the exit code is 0.',
  error:
    'Only when the call was refused (exit code 2): `{ code, message }`, with a code `C…` that is stable for tools.',
  version: 'Only for `dgr --version`: the version of the CLI.',
};
