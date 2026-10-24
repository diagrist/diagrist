import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { run } from '../src/index.js';
import { nodeIo } from '../src/node-io.js';

describe('the Node adapter', () => {
  it('lets `dgr fmt` rewrite a real file', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'diagrist-cli-')), 'login.dgr');
    writeFileSync(file, 'diagram sequence "Login"\n    participant api "API"\n\n\n\nparticipant db "DB"\n');
    const printed: string[] = [];
    const io = { ...nodeIo(), stdout: (text: string) => void printed.push(text) };
    expect(await run(['fmt', file], io, undefined)).toBe(0);
    expect(readFileSync(file, 'utf8')).toBe(
      'diagram sequence "Login"\n  participant api "API"\n\nparticipant db "DB"\n',
    );
    expect(printed).toEqual([`formatted ${file}\n`]);
  });

  it('reports a missing file and a directory as such', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'diagrist-cli-'));
    const io = nodeIo();
    expect(await io.readFile(join(dir, 'missing.dgr'))).toEqual({ problem: 'missing' });
    expect(await io.readFile(dir)).toEqual({ problem: 'directory' });
    expect(await io.writeFile(dir, 'x')).toBe('directory');
  });
});
