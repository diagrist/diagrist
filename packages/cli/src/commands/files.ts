import type { Locale } from '@diagrist/lang';
import type { Io } from '../io.js';
import { type Problem, problem, say } from '../messages.js';

export interface Source {
  readonly file: string;
  readonly text: string;
}

export async function readSource(io: Io, file: string, locale: Locale): Promise<Source | Problem> {
  const read = await io.readFile(file);
  return 'problem' in read
    ? problem('unreadable', { file, reason: say(read.problem, locale) })
    : { file, text: read.text };
}

/** Reads every file before anything is written, so a missing file stops the call before it changes anything. */
export async function readSources(io: Io, files: readonly string[], locale: Locale): Promise<Source[] | Problem> {
  const sources: Source[] = [];
  for (const file of files) {
    const source = await readSource(io, file, locale);
    if ('problem' in source) return source;
    sources.push(source);
  }
  return sources;
}

export async function writeOutput(io: Io, file: string, text: string, locale: Locale): Promise<Problem | undefined> {
  const failed = await io.writeFile(file, text);
  return failed === undefined ? undefined : problem('unwritable', { file, reason: say(failed, locale) });
}
