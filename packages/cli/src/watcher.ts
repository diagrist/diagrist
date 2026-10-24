/**
 * The port through which `build --watch` learns that its source changed (ADR 0009). `node-watcher.ts` implements
 * it with `node:fs`, tests use a scripted one.
 */
export interface Watcher {
  /**
   * Starts watching the file at `path` at once, so a change made while the first build runs is not lost. Each
   * `next()` resolves when the file has changed and settled; several writes in quick succession count as one, and
   * a save that only touches the file without changing it counts as none. The iteration ends when the host is
   * stopped (Ctrl+C) or `return()` is called.
   */
  changes(path: string): AsyncIterator<void, undefined>;
}
