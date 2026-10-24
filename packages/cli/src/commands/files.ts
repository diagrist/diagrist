import type { Locale } from '@diagrist/lang';
import type { Finding } from '../engine.js';
import type { Io } from '../io.js';
import { legacyExtension, type Problem, problem, say } from '../messages.js';

export interface Source {
  readonly file: string;
  readonly text: string;
  /** Findings about the file itself rather than its content, reported before those of the content. */
  readonly notices: readonly Finding[];
}

export async function readSource(io: Io, file: string, locale: Locale): Promise<Source | Problem> {
  const read = await io.readFile(file);
  if ('problem' in read) return problem('unreadable', { file, reason: say(read.problem, locale) });
  return { file, text: read.text, notices: file.endsWith('.dia') ? [legacyExtension(file, locale)] : [] };
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

export async function writeOutput(
  io: Io,
  file: string,
  content: string | Uint8Array,
  locale: Locale,
): Promise<Problem | undefined> {
  const failed = await io.writeFile(file, content);
  return failed === undefined ? undefined : problem('unwritable', { file, reason: say(failed, locale) });
}
