import type { Engine, Io, Raster } from '../../src/index.js';
import { run } from '../../src/index.js';
import { fakeEngine } from './fake-engine.js';
import { fakeRaster } from './fake-raster.js';
import { type ScriptedWatcher, scriptedWatcher } from './fake-watcher.js';

/** A file as the in-memory host keeps it: text as written, bytes such as a PNG as they are. */
type Content = string | Uint8Array;

/** An in-memory host: files in a map, everything printed collected per stream. */
export interface MemoryHost {
  readonly files: Map<string, Content>;
  readonly io: Io;
  readonly stdout: () => string;
  readonly stderr: () => string;
}

export function memoryHost(files: Record<string, string> = {}): MemoryHost {
  const contents = new Map<string, Content>(Object.entries(files));
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = {
    readFile: async (path) => {
      const content = contents.get(path);
      if (content === undefined) return { problem: 'missing' };
      return { text: typeof content === 'string' ? content : new TextDecoder().decode(content) };
    },
    writeFile: async (path, content) => {
      if (path.startsWith('readonly/')) return 'denied';
      contents.set(path, content);
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

/** What a call runs against besides its arguments: input files and the ports, fakes unless given. */
interface Setup {
  files?: Record<string, string>;
  engine?: Engine;
  raster?: Raster;
  /** For `--watch`: each entry edits the files, `null` deletes one, and is then reported as one change. */
  changes?: readonly Readonly<Record<string, string | null>>[];
}

/** Runs one call against an in-memory host and returns what a caller would observe; engine and raster are fakes by default. */
export async function call(
  argv: readonly string[],
  options: Setup = {},
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  files: Map<string, Content>;
  watcher: ScriptedWatcher;
}> {
  const host = memoryHost(options.files);
  const watcher = scriptedWatcher((options.changes ?? []).map((edits) => () => edit(host.files, edits)));
  const engine = options.engine ?? fakeEngine();
  const exitCode = await run(argv, { io: host.io, engine, raster: options.raster ?? fakeRaster(), watcher });
  return { exitCode, stdout: host.stdout(), stderr: host.stderr(), files: host.files, watcher };
}

function edit(files: Map<string, Content>, edits: Readonly<Record<string, string | null>>): void {
  for (const [path, text] of Object.entries(edits)) {
    if (text === null) files.delete(path);
    else files.set(path, text);
  }
}

/** The `--json` document printed on stdout. */
export async function callJson(
  argv: readonly string[],
  options: Setup = {},
): Promise<{ exitCode: number; json: Record<string, unknown> }> {
  const result = await call([...argv, '--json'], options);
  return { exitCode: result.exitCode, json: JSON.parse(result.stdout) as Record<string, unknown> };
}
