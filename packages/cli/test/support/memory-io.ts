import type { Engine, Io } from '../../src/index.js';
import { run } from '../../src/index.js';

/** An in-memory host: files in a map, everything printed collected per stream. */
export interface MemoryHost {
  readonly files: Map<string, string>;
  readonly io: Io;
  readonly stdout: () => string;
  readonly stderr: () => string;
}

export function memoryHost(files: Record<string, string> = {}): MemoryHost {
  const contents = new Map(Object.entries(files));
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = {
    readFile: async (path) => {
      const text = contents.get(path);
      return text === undefined ? { problem: 'missing' } : { text };
    },
    writeFile: async (path, text) => {
      if (path.startsWith('readonly/')) return 'denied';
      contents.set(path, text);
      return undefined;
    },
    stdout: (text) => {
      out.push(text);
    },
    stderr: (text) => {
      err.push(text);
    },
  };
  return { files: contents, io, stdout: () => out.join(''), stderr: () => err.join('') };
}

/** Runs one call against an in-memory host and returns what a caller would observe. */
export async function call(
  argv: readonly string[],
  options: { files?: Record<string, string>; engine?: Engine } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string; files: Map<string, string> }> {
  const host = memoryHost(options.files);
  const exitCode = await run(argv, host.io, options.engine);
  return { exitCode, stdout: host.stdout(), stderr: host.stderr(), files: host.files };
}

/** The `--json` document printed on stdout. */
export async function callJson(
  argv: readonly string[],
  options: { files?: Record<string, string>; engine?: Engine } = {},
): Promise<{ exitCode: number; json: Record<string, unknown> }> {
  const result = await call([...argv, '--json'], options);
  return { exitCode: result.exitCode, json: JSON.parse(result.stdout) as Record<string, unknown> };
}
