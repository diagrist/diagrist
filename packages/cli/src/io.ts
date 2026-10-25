/** Why a file could not be read or written. The CLI turns it into a message in the requested locale. */
export type FileProblem = 'missing' | 'directory' | 'denied' | 'failed' | 'outside' | 'tooLarge';

/**
 * How a file a diagram names is read (ADR 0021): only when its real path, links followed, lies inside the folder the
 * host runs in (`outside` otherwise), and only up to `maxBytes` (`tooLarge`).
 */
export interface ReadLimits {
  readonly maxBytes: number;
}

/** The text of a file read as UTF-8, or why it could not be read. */
export type FileRead = { readonly text: string } | { readonly problem: FileProblem };

/**
 * Everything the CLI needs from its host. `node-io.ts` implements it for Node, tests use one in memory.
 * Paths are passed on as given on the command line; the host resolves them against its working directory.
 */
export interface Io {
  /** Reads a file; with `limits`, a file a diagram names, confined as `ReadLimits` says. */
  readFile(path: string, limits?: ReadLimits): Promise<FileRead>;
  /**
   * Writes text as UTF-8 or bytes as they are. Resolves to the problem when writing failed, to `undefined` when
   * the file was written.
   */
  writeFile(path: string, content: string | Uint8Array): Promise<FileProblem | undefined>;
  stdout(text: string): void;
  stderr(text: string): void;
}
