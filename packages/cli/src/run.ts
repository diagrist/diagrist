import { COMMANDS } from './commands/all.js';
import type { Command, Outcome } from './commands/command.js';
import { help } from './commands/help.js';
import type { Engine } from './engine.js';
import type { Io } from './io.js';
import { VERSION } from './manifest.js';
import { type Problem, say } from './messages.js';
import { type Parsed, parse } from './parse.js';
import type { Raster } from './raster.js';
import { deliver } from './report/output.js';
import { watch, watchedFile } from './watch.js';
import type { Watcher } from './watcher.js';

/** The ports a call reaches everything outside the CLI through (ADR 0009); `main.ts` wires in the real ones. */
export interface Ports {
  readonly io: Io;
  readonly engine: Engine;
  readonly raster: Raster;
  /** Used only by `build --watch`. */
  readonly watcher: Watcher;
}

/**
 * Runs one call of the CLI and resolves to its exit code: 0 done, 1 a finding with severity error, 2 a wrong
 * call. All input and output goes through `io`, every diagram through `engine`, every PNG through `raster`. With
 * `build --watch` it builds again after each change the `watcher` reports and ends when the watcher does.
 */
export async function run(argv: readonly string[], ports: Ports): Promise<number> {
  const parsed = parse(argv, COMMANDS);
  const { io } = ports;
  const audience = { command: commandName(parsed), json: parsed.json, locale: parsed.locale };
  const once = async (): Promise<number> => deliver(parsed.problem ?? (await perform(parsed, ports)), audience, io);
  const file = watchedFile(parsed);
  if (file === undefined) return once();
  return watch(ports.watcher.changes(file), once, (line) => {
    if (!parsed.json) io.stdout(`${say(line, parsed.locale, { file })}\n`);
  });
}

async function perform(parsed: Parsed, { io, engine, raster }: Ports): Promise<Outcome | Problem> {
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
