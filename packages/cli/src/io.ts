/** Why a file could not be read or written. The CLI turns it into a message in the requested locale. */
export type FileProblem = 'missing' | 'directory' | 'denied' | 'failed';

export type FileRead = { readonly text: string } | { readonly problem: FileProblem };

/**
 * Everything the CLI needs from its host. `node-io.ts` implements it for Node, tests use one in memory.
 * Paths are passed on as given on the command line; the host resolves them against its working directory.
 */
export interface Io {
  readFile(path: string): Promise<FileRead>;
  /** Resolves to the problem when writing failed, to `undefined` when the file was written. */
  writeFile(path: string, text: string): Promise<FileProblem | undefined>;
  stdout(text: string): void;
  stderr(text: string): void;
}
