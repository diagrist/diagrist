import { readFile, writeFile } from 'node:fs/promises';
import type { FileProblem, Io } from './io.js';

/** The host as Node sees it: files relative to the working directory, and the process's output streams. */
export function nodeIo(): Io {
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
    stdout: (text) => {
      process.stdout.write(text);
    },
    stderr: (text) => {
      process.stderr.write(text);
    },
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
  const code = error instanceof Error && 'code' in error ? error.code : undefined;
  return (typeof code === 'string' ? PROBLEMS[code] : undefined) ?? 'failed';
}
