import { type FSWatcher, readFileSync, watch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import * as timers from 'node:timers/promises';
import type { Watcher } from './watcher.js';

/** How the Node watcher settles bursts of events and when it stops. */
export interface WatchOptions {
  /** Quiet time in milliseconds after the last event before a change counts. Default: 100. */
  readonly settle?: number;
  /** Ends every watch when aborted. Default: the first Ctrl+C (SIGINT) of the process. */
  readonly stop?: AbortSignal;
}

/**
 * The watcher as Node sees it. It watches the directory of the file rather than the file itself, because many
 * editors save by writing a new file and renaming it over the old one; a watch on the old file would see it go
 * and miss every later save. Events of other files in the directory are ignored, a burst of events is settled
 * into one, and the content is compared with what the last change saw, so touching a file builds nothing.
 */
export function nodeWatcher(options: WatchOptions = {}): Watcher {
  return { changes: (path) => fileChanges(resolve(path), options.settle ?? 100, options.stop) };
}

function fileChanges(target: string, settle: number, stop: AbortSignal | undefined): AsyncIterator<void, undefined> {
  const ended = new AbortController();
  const end = (): void => ended.abort();
  const name = basename(target);
  let dirty = false;
  let wake: (() => void) | undefined;
  let watcher: FSWatcher | undefined;
  ended.signal.addEventListener('abort', () => {
    watcher?.close();
    stop?.removeEventListener('abort', end);
    process.off('SIGINT', end);
    wake?.();
  });
  if (stop === undefined) process.once('SIGINT', end);
  else if (stop.aborted) end();
  else stop.addEventListener('abort', end);
  try {
    watcher = watch(dirname(target), (_event, file) => {
      if (file !== null && file !== name) return;
      dirty = true;
      wake?.();
    });
    watcher.on('error', end);
  } catch {
    end();
  }
  let seen = contentNow(target);
  const quiet = async (): Promise<void> => {
    do {
      dirty = false;
      await timers.setTimeout(settle, undefined, { signal: ended.signal }).catch(() => undefined);
    } while (dirty && !ended.signal.aborted);
  };
  return {
    async next() {
      while (!ended.signal.aborted) {
        if (!dirty)
          await new Promise<void>((woken) => {
            wake = woken;
          });
        wake = undefined;
        if (ended.signal.aborted) break;
        await quiet();
        const now = await readFile(target, 'utf8').catch(() => null);
        if (ended.signal.aborted) break;
        if (now === seen) continue;
        seen = now;
        return { done: false, value: undefined };
      }
      return { done: true, value: undefined };
    },
    async return() {
      end();
      return { done: true, value: undefined };
    },
  };
}

/** The content when watching starts, read before the first build reads it, so a change in between is seen. */
function contentNow(target: string): string | null {
  try {
    return readFileSync(target, 'utf8');
  } catch {
    return null;
  }
}
