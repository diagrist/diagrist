import type { Watcher } from '../../src/index.js';

/** A watcher that reports the changes of a script, and remembers what it was asked to watch. */
export interface ScriptedWatcher extends Watcher {
  /** The paths `changes` was called with, in order. */
  readonly watched: readonly string[];
  /** Whether the CLI ended the watch itself with `return()`, rather than running the script out. */
  stopped(): boolean;
}

/**
 * A stand-in for the file watcher: each step runs, typically editing a file, and is then reported as one change of
 * the first file watched. After the last step the changes end, as they do on Ctrl+C. Files watched later report
 * nothing and end when they are stopped.
 */
export function scriptedWatcher(steps: readonly (() => void)[]): ScriptedWatcher {
  const watched: string[] = [];
  let stopped = false;
  return {
    watched,
    stopped: () => stopped,
    changes(path) {
      watched.push(path);
      if (watched.length > 1) return quiet();
      let next = 0;
      return {
        next: async () => {
          const step = stopped ? undefined : steps[next++];
          if (step === undefined) return { done: true, value: undefined };
          step();
          return { done: false, value: undefined };
        },
        return: async () => {
          stopped = true;
          return { done: true, value: undefined };
        },
      };
    },
  };
}

/** The watch of a file that never changes: it ends when it is stopped. */
function quiet(): AsyncIterator<void, undefined> {
  let end: (() => void) | undefined;
  const ended = new Promise<void>((resolve) => {
    end = resolve;
  });
  return {
    next: async () => {
      await ended;
      return { done: true, value: undefined };
    },
    return: async () => {
      end?.();
      return { done: true, value: undefined };
    },
  };
}
