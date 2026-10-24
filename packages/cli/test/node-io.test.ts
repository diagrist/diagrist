import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { run } from '../src/index.js';
import { nodeIo } from '../src/node-io.js';
import { fakeEngine } from './support/fake-engine.js';
import { fakeRaster } from './support/fake-raster.js';
import { scriptedWatcher } from './support/fake-watcher.js';

describe('the Node adapter', () => {
  it('lets `dgr fmt` rewrite a real file', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'diagrist-cli-')), 'login.dgr');
    writeFileSync(file, 'diagram sequence "Login"\n    participant api "API"\n\n\n\nparticipant db "DB"\n');
    const printed: string[] = [];
    const io = { ...nodeIo(), stdout: (text: string) => void printed.push(text) };
    expect(
      await run(['fmt', file], { io, engine: fakeEngine(), raster: fakeRaster(), watcher: scriptedWatcher([]) }),
    ).toBe(0);
    expect(readFileSync(file, 'utf8')).toBe(
      'diagram sequence "Login"\n  participant api "API"\n\nparticipant db "DB"\n',
    );
    expect(printed).toEqual([`formatted ${file}\n`]);
  });

  it('ends quietly with its exit code when the reader of stdout is gone, as in `dgr help | head`', async () => {
    const epipe = (): Error => Object.assign(new Error('write EPIPE'), { code: 'EPIPE' });
    const writes: string[] = [];
    const stdout = new Writable({
      write(chunk: Buffer, _encoding, done) {
        writes.push(String(chunk));
        done(epipe());
      },
    });
    const stderr = new Writable({ write: (_chunk, _encoding, done) => done() });
    const io = nodeIo({ stdout, stderr });
    expect(await run(['help'], { io, engine: fakeEngine(), raster: fakeRaster(), watcher: scriptedWatcher([]) })).toBe(
      0,
    );
    io.stdout('more\n');
    await new Promise((resolve) => setImmediate(resolve));
    expect(writes).toHaveLength(1);
  });

  it('writes bytes as they are and text as UTF-8', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diagrist-cli-'));
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff]);
    expect(await nodeIo().writeFile(join(dir, 'a.png'), bytes)).toBeUndefined();
    expect(new Uint8Array(readFileSync(join(dir, 'a.png')))).toEqual(bytes);
    await nodeIo().writeFile(join(dir, 'a.svg'), '<svg>Größe</svg>');
    expect(readFileSync(join(dir, 'a.svg'), 'utf8')).toBe('<svg>Größe</svg>');
  });

  it('reports a missing file and a directory as such', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diagrist-cli-'));
    const io = nodeIo();
    expect(await io.readFile(join(dir, 'missing.dgr'))).toEqual({ problem: 'missing' });
    expect(await io.readFile(dir)).toEqual({ problem: 'directory' });
    expect(await io.writeFile(dir, 'x')).toBe('directory');
  });
});
