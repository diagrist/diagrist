import { readFile, writeFile } from 'node:fs/promises';
import type { FileProblem, Io } from './io.js';

/** The two output streams of the host; `process` has them, tests pass their own. */
export interface Streams {
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
}

/** The host as Node sees it: files relative to the working directory, and the process's output streams. */
export function nodeIo(streams: Streams = process): Io {
  const stdout = untilClosed(streams.stdout);
  const stderr = untilClosed(streams.stderr);
  return {
    readFile: (path) =>
      readFile(path, 'utf8').then(
        (text) => ({ text }),
        (error: unknown) => ({ problem: problemOf(error) }),
      ),
    writeFile: (path, text) =>
      writeFile(path, text).then(
        () => undefined,
        (error: unknown) => problemOf(error),
      ),
    stdout,
    stderr,
  };
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
