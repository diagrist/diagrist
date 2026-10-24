import type { Parsed } from './parse.js';

/** The file `--watch` observes: the source of `build`, the only command with the option; `undefined` otherwise. */
export function watchedFile(parsed: Parsed): string | undefined {
  if (parsed.problem !== undefined || parsed.help || parsed.options.watch !== true) return undefined;
  const { file } = parsed.arguments;
  return typeof file === 'string' ? file : undefined;
}

/** A status line of the watch: it started, or the source changed and is built again. */
export type WatchStatus = 'watching' | 'changed';

/**
 * Builds once, then again after every change, until the changes end (Ctrl+C), and resolves to the exit code of
 * the last build. The first build decides whether the call can work at all: when it is refused (exit code 2), for
 * a missing source or a wrong `--scale`, the watch stops before it begins. After that nothing ends it, neither
 * errors in the diagram nor a refusal such as a source that is gone for a moment; each is printed and the next
 * change builds again.
 */
export async function watch(
  changes: AsyncIterator<void, undefined>,
  build: () => Promise<number>,
  status: (line: WatchStatus) => void,
): Promise<number> {
  let exitCode = await build();
  if (exitCode === 2) {
    await changes.return?.();
    return exitCode;
  }
  status('watching');
  while (!(await changes.next()).done) {
    status('changed');
    exitCode = await build();
  }
  return exitCode;
}
