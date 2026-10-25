import { readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { sep } from 'node:path';
import type { FileProblem, FileRead, Io, ReadLimits } from './io.js';

/** The two output streams of the host; `process` has them, tests pass their own. */
export interface Streams {
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
}

/**
 * The host as Node sees it: files relative to the working directory, and the process's output streams. Files a
 * diagram names are read only inside `root`, the working directory unless a test names another.
 */
export function nodeIo(streams: Streams = process, root: string = process.cwd()): Io {
  const stdout = untilClosed(streams.stdout);
  const stderr = untilClosed(streams.stderr);
  return {
    readFile: (path, limits) =>
      readWithin(path, root, limits).catch((error: unknown) => ({ problem: problemOf(error) })),
    writeFile: (path, content) =>
      writeFile(path, content).then(
        () => undefined,
        (error: unknown) => problemOf(error),
      ),
    stdout,
    stderr,
  };
}

/** Reads a file; with limits only when its real path lies in the real `root` and it is small enough. */
async function readWithin(path: string, root: string, limits: ReadLimits | undefined): Promise<FileRead> {
  if (limits !== undefined) {
    const [real, folder] = await Promise.all([realpath(path), realpath(root)]);
    if (!real.startsWith(folder.endsWith(sep) ? folder : `${folder}${sep}`)) return { problem: 'outside' };
    if ((await stat(real)).size > limits.maxBytes) return { problem: 'tooLarge' };
  }
  return { text: await readFile(path, 'utf8') };
}

/**
 * Writes to a stream until its reader is gone. A reader that stops early, like `head` in
 * `dgr grammar sequence | head`, closes the pipe; Node then reports EPIPE as an `error` event, which would crash
 * the process with a stack trace. The rest of the output is dropped instead and the call ends with its own exit
 * code. Any other write error is raised again as before.
 */
function untilClosed(stream: NodeJS.WritableStream): (text: string) => void {
  let closed = false;
  const onError = (error: unknown): void => {
    if (codeOf(error) === 'EPIPE') {
      closed = true;
      return;
    }
    stream.off('error', onError);
    stream.emit('error', error);
  };
  stream.on('error', onError);
  return (text) => {
    if (!closed) stream.write(text);
  };
}

/** Node error codes the CLI explains; anything else is reported as `failed`. */
const PROBLEMS: Readonly<Record<string, FileProblem>> = {
  ENOENT: 'missing',
  EISDIR: 'directory',
  EACCES: 'denied',
  EPERM: 'denied',
};

function problemOf(error: unknown): FileProblem {
  const code = codeOf(error);
  return (code === undefined ? undefined : PROBLEMS[code]) ?? 'failed';
}

function codeOf(error: unknown): string | undefined {
  const code = error instanceof Error && 'code' in error ? error.code : undefined;
  return typeof code === 'string' ? code : undefined;
}
