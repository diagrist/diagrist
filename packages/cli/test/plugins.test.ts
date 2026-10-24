import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coreEngine } from '../src/core-engine.js';
import { PLUGINS } from '../src/plugins.js';
import { call, callJson } from './support/memory-io.js';

const engine = coreEngine(PLUGINS);
const read = (path: string): string => readFileSync(new URL(`../../../plugins/${path}`, import.meta.url), 'utf8');

describe('the plugins the CLI ships with', () => {
  it('draws a C4 context diagram into the same SVG as the architecture plugin golden', async () => {
    const source = read('plugin-architecture/examples/radverleih/kontext.dgr');
    const result = await call(['build', 'kontext.dgr'], { files: { 'kontext.dgr': source }, engine });
    expect(result.exitCode).toBe(0);
    expect(result.files.get('kontext.svg')).toBe(read('plugin-architecture/test/__golden__/kontext.svg'));
  });

  it('lists every kind of every shipped plugin', async () => {
    const { json } = await callJson(['grammar'], { engine });
    const listed = JSON.stringify(json);
    for (const kind of ['sequence', 'usecase', 'context', 'container', 'component']) expect(listed).toContain(kind);
  });
});
