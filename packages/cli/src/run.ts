import { COMMANDS } from './commands/all.js';
import type { Command, Outcome } from './commands/command.js';
import { help } from './commands/help.js';
import type { Engine } from './engine.js';
import type { Io } from './io.js';
import { VERSION } from './manifest.js';
import type { Problem } from './messages.js';
import { type Parsed, parse } from './parse.js';
import type { Raster } from './raster.js';
import { deliver } from './report/output.js';

/**
 * Runs one call of the CLI and resolves to its exit code: 0 done, 1 a finding with severity error, 2 a wrong
 * call. All input and output goes through `io`, every diagram goes through `engine`, every PNG through `raster`.
 */
export async function run(argv: readonly string[], io: Io, engine: Engine, raster: Raster): Promise<number> {
  const parsed = parse(argv, COMMANDS);
  const answer = parsed.problem ?? (await perform(parsed, io, engine, raster));
  return deliver(answer, { command: commandName(parsed), json: parsed.json, locale: parsed.locale }, io);
}

async function perform(parsed: Parsed, io: Io, engine: Engine, raster: Raster): Promise<Outcome | Problem> {
  if (asksForVersion(parsed)) return { exitCode: 0, json: { version: VERSION }, text: VERSION };
  const command = chosen(parsed);
  const args = command === parsed.command ? parsed.arguments : { command: parsed.command?.name };
  return command.run({
    arguments: args,
    options: parsed.options,
    locale: parsed.locale,
    io,
    engine,
    raster,
    commands: COMMANDS,
  });
}

function asksForVersion(parsed: Parsed): boolean {
  return parsed.command === undefined && parsed.options.version === true;
}

/** `--help` and `dgr` without a command are answered by `help`. */
function chosen(parsed: Parsed): Command {
  return parsed.command === undefined || parsed.help ? help : parsed.command;
}

/** The `command` field of the JSON envelope: what answered, or `null` when no command did. */
function commandName(parsed: Parsed): string | null {
  if (parsed.problem) return parsed.command?.name ?? null;
  return asksForVersion(parsed) ? null : chosen(parsed).name;
}
