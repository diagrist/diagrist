import type { Locale } from '@diagrist/lang';
import type { Compilation, Engine, Finding } from '../engine.js';
import type { Io } from '../io.js';
import { legacyExtension } from '../legacy.js';
import { type Problem, problem } from '../messages.js';
import { say } from '../say.js';

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

/** The most a file a diagram names may have, 1 MB: diagrams are text, and a host never reads without end. */
const NEEDED_BYTES = 1024 * 1024;

/** A source compiled with every file it needs, and the texts of those files by path. */
export interface Compiled {
  readonly compilation: Compilation;
  readonly files: Readonly<Record<string, string>>;
}

/**
 * Compiles a source together with the files it needs: each compilation names them (`needs`), they are read through
 * `io`, and the source is compiled again until nothing is missing. A file that cannot be read refuses the call (C018).
 * The kernel has checked how each path is written (L119); `io` confines what it reads by real path and size.
 */
export async function compileSource(
  io: Io,
  engine: Engine,
  source: Source,
  locale: Locale,
): Promise<Compiled | Problem> {
  const files: Record<string, string> = {};
  for (;;) {
    const compilation = engine.compile(source.text, { locale, path: source.file, files });
    const missing = compilation.needs.filter((need) => !Object.hasOwn(files, need.path));
    if (missing.length === 0) return { compilation, files };
    for (const need of missing) {
      const read = await io.readFile(need.path, { maxBytes: NEEDED_BYTES });
      if ('problem' in read) {
        const at = { line: String(need.span.line), source: need.span.file ?? source.file };
        const reason = say(read.problem, locale, { max: '1 MB' });
        return problem('unreadableNeed', { file: need.path, ...at, reason });
      }
      files[need.path] = read.text;
    }
  }
}
