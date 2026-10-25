import type { Parsed } from './parse.js';
import type { Watcher } from './watcher.js';

/** The file `--watch` observes: the source of `build`, the only command with the option; `undefined` otherwise. */
export function watchedFile(parsed: Parsed): string | undefined {
  if (parsed.problem !== undefined || parsed.help || parsed.options.watch !== true) return undefined;
  const { file } = parsed.arguments;
  return typeof file === 'string' ? file : undefined;
}

/** A status line of the watch: it started, or a file changed and the source is built again. */
export type WatchStatus = 'watching' | 'changed';

/** The changes of a growing set of files, one at a time, until the first watch ends (Ctrl+C). */
export interface Changes {
  /** Watches these files too, from now on; files already watched are left as they are. */
  add(paths: readonly string[]): void;
  /** Resolves to the path that changed, or `undefined` when the watch ended. */
  next(): Promise<string | undefined>;
  /** Ends every watch. */
  stop(): Promise<void>;
}

/** Changes of `first` and of every file added later, through one watch per file of `watcher`. */
export function changesOf(watcher: Watcher, first: string): Changes {
  const watches = new Map<string, AsyncIterator<void, undefined>>();
  const pending = new Map<string, Promise<{ path: string; done: boolean }>>();
  const add = (paths: readonly string[]) => {
    for (const path of paths) if (!watches.has(path)) watches.set(path, watcher.changes(path));
  };
  add([first]);
  return {
    add,
    async next() {
      for (const [path, changes] of watches)
        if (!pending.has(path))
          pending.set(
            path,
            changes.next().then((r) => ({ path, done: r.done === true })),
          );
      const { path, done } = await Promise.race(pending.values());
      pending.delete(path);
      return done ? undefined : path;
    },
    async stop() {
      await Promise.all([...watches.values()].map((changes) => changes.return?.()));
    },
  };
}

/**
 * Builds once, then again after every change, until the changes end (Ctrl+C), and resolves to the exit code of
 * the last build. The first build decides whether the call can work at all: when it is refused (exit code 2), for
 * a missing source or a wrong `--scale`, the watch stops before it begins. After that nothing ends it, neither
 * errors in the diagram nor a refusal such as a source that is gone for a moment; each is printed and the next
 * change builds again.
 */
export async function watch(
  changes: Changes,
  build: () => Promise<number>,
  status: (line: WatchStatus, file: string) => void,
  file: string,
): Promise<number> {
  let exitCode = await build();
  if (exitCode === 2) {
    await changes.stop();
    return exitCode;
  }
  status('watching', file);
  for (let changed = await changes.next(); changed !== undefined; changed = await changes.next()) {
    status('changed', changed);
    exitCode = await build();
  }
  await changes.stop();
  return exitCode;
}
