import type { Watcher } from '../../src/index.js';

/** A watcher that reports the changes of a script, and remembers what it was asked to watch. */
export interface ScriptedWatcher extends Watcher {
  /** The paths `changes` was called with, in order. */
  readonly watched: readonly string[];
  /** Whether the CLI ended the watch itself with `return()`, rather than running the script out. */
  stopped(): boolean;
}

/**
 * A stand-in for the file watcher: each step runs, typically editing a file, and is then reported as one change.
 * After the last step the changes end, as they do on Ctrl+C.
 */
export function scriptedWatcher(steps: readonly (() => void)[]): ScriptedWatcher {
  const watched: string[] = [];
  let stopped = false;
  return {
    watched,
    stopped: () => stopped,
    changes(path) {
      watched.push(path);
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
